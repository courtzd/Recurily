import React from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import type { Database } from '../lib/database.types';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Initialize PDF.js worker
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type Subscription = Database['public']['Tables']['subscriptions']['Insert'];

// Subscription detection patterns
const PATTERNS = {
  price: /\$\s*(\d+(?:\.\d{2})?)/i,
  serviceName: /(?:subscription|plan|membership)\s+(?:to|for)?\s+([A-Za-z0-9\s]+)/i,
  billingCycle: /(monthly|yearly|quarterly)/i,
  nextBilling: /next\s+(?:billing|payment|charge)\s+(?:date|on)?\s*:\s*([A-Za-z0-9\s,]+)/i
};

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentUploadModal({ isOpen, onClose, onSuccess }: DocumentUploadModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [processingText, setProcessingText] = React.useState('');
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<Partial<Subscription>>({
    service_name: '',
    price: 0,
    billing_cycle: 'monthly',
    category: 'other',
    next_billing_date: new Date().toISOString().split('T')[0],
    status: 'active'
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when modal is closed
  React.useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setUploadProgress(0);
      setProcessingText('');
      setUploadedFile(null);
      setUploadedFileUrl(null);
      setFormData({
        service_name: '',
        price: 0,
        billing_cycle: 'monthly',
        category: 'other',
        next_billing_date: new Date().toISOString().split('T')[0],
        status: 'active'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  const processDocument = async (file: File) => {
    setProcessingText('Initializing OCR...');
    try {
      let worker;
      try {
        worker = await createWorker({
          logger: progress => {
            const message = typeof progress === 'string' 
              ? progress 
              : progress.status === 'recognizing text'
                ? `Processing text: ${Math.floor((progress.progress || 0) * 100)}%`
                : progress.status || '';
            setProcessingText(message);
          },
          errorHandler: error => {
            console.error('OCR error:', error);
            setError('Error processing document: ' + error.message);
          }
        });

        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        setProcessingText('OCR engine ready');
      } catch (error) {
        console.error('Failed to initialize OCR:', error);
        throw new Error('Failed to initialize document processing. Please try again.');
      }
      
      let textContent = '';

      if (file.type === 'application/pdf') {
        // Handle PDF files
        setProcessingText('Processing PDF...');
        let pdfProgress = 0;
        let pdf;
        try {
          const arrayBuffer = await file.arrayBuffer();
          pdf = await getDocument({ data: arrayBuffer }).promise;
          
          // Extract text from all pages
          let pdfText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            pdfProgress = Math.floor((i / pdf.numPages) * 100);
            setProcessingText(`Processing PDF page ${i} of ${pdf.numPages} (${pdfProgress}%)`);
            try {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              pdfText += content.items.map((item: any) => item.str).join(' ') + '\n';
            } catch (pageError) {
              console.warn(`Failed to process page ${i}:`, pageError);
              continue;
            }
          }
          
          setProcessingText('Analyzing text...');
          
          if (pdfText.trim()) {
            const { data: { text } } = await worker.recognize(pdfText);
            textContent = text;
          } else {
            throw new Error('No text content found in PDF');
          }
        } catch (error) {
          console.error('Failed to process PDF:', error);
          throw new Error('Failed to process PDF document. Please ensure it is a valid PDF file.');
        } finally {
          if (pdf) {
            try {
              await pdf.destroy();
            } catch (e) {
              console.warn('Failed to destroy PDF document:', e);
            }
          }
        }
      } else if (file.type.startsWith('image/')) {
        // Handle images with Tesseract
        setProcessingText('Processing image...');
        
        try {
          const reader = new FileReader();
          const dataUrl = await new Promise<string | ArrayBuffer>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
          });

          setProcessingText('Analyzing image...');
          const { data: { text } } = await worker.recognize(dataUrl.toString());
          textContent = text;
        } catch (error) {
          console.error('Failed to process image:', error);
          throw new Error('Failed to process image. Please ensure it is a valid image file.');
        }
      } else {
        throw new Error('Unsupported file type');
      }
      
      setProcessingText('Extracting subscription details...');
      
      if (!textContent.trim()) {
        throw new Error('No text could be extracted from the document');
      }
      
      try {
        // Extract subscription details
        const priceMatch = textContent.match(PATTERNS.price);
        const serviceMatch = textContent.match(PATTERNS.serviceName);
        const cycleMatch = textContent.match(PATTERNS.billingCycle);
        const billingMatch = textContent.match(PATTERNS.nextBilling);
        
        // Update form with detected data
        setFormData(prev => ({
          ...prev,
          service_name: serviceMatch?.[1]?.trim() || prev.service_name,
          price: priceMatch ? parseFloat(priceMatch[1]) : prev.price,
          billing_cycle: (cycleMatch?.[1]?.toLowerCase() as Subscription['billing_cycle']) || prev.billing_cycle,
          next_billing_date: billingMatch?.[2] 
            ? new Date(billingMatch[2]).toISOString().split('T')[0] 
            : prev.next_billing_date
        }));
      } catch (error) {
        console.error('Failed to extract subscription details:', error);
        throw new Error('Failed to extract subscription details. Please enter them manually.');
      }
      
      setProcessingText('');
      
      try {
        // Clean up worker
        await worker.terminate();
      } catch (error) {
        console.warn('Failed to terminate worker:', error);
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process document. Please try again or enter details manually.');
      setProcessingText('');
      
      // Clean up worker if it exists
      if (worker) {
        try {
          await worker.terminate();
        } catch (e) {
          console.warn('Failed to terminate worker during error cleanup:', e);
        }
      }
      
      // Keep existing form data to allow manual editing
      return;
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (JPEG, PNG)');
      return;
    }

    // Reset state
    setError(null);
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadedFile(file);

    try {
      // Create unique filename with timestamp
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('subscription-documents')
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('subscription-documents')
        .getPublicUrl(fileName);
      
      setUploadedFileUrl(publicUrl);

      // Process document with OCR
      await processDocument(file);

      // Initialize form with basic data
      setFormData({
        service_name: file.name.split('.')[0].replace(/[^a-zA-Z0-9\s]/g, ' '),
        price: 0,
        billing_cycle: 'monthly',
        category: 'other',
        next_billing_date: new Date().toISOString().split('T')[0],
        status: 'active',
        url: publicUrl
      });

    } catch (error) {
      console.error('Error uploading document:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!formData || !user) return;

    try {
      setLoading(true);
      
      if (!formData.service_name) {
        throw new Error('Service name is required');
      }

      if (!formData.price || formData.price <= 0) {
        throw new Error('Please enter a valid price');
      }

      // Format URL to ensure it matches the database constraint
      let formattedUrl = null;
      if (uploadedFileUrl) {
        try {
          const url = new URL(uploadedFileUrl);
          formattedUrl = url.toString();
        } catch (e) {
          console.warn('Invalid URL format:', e);
        }
      }

      const subscriptionData: Subscription = {
        service_name: formData.service_name || '',
        price: formData.price || 0,
        billing_cycle: formData.billing_cycle || 'monthly',
        category: formData.category || 'other',
        next_billing_date: formData.next_billing_date || new Date().toISOString().split('T')[0],
        status: 'active',
        user_id: user.id,
        url: formattedUrl
      } as Subscription;

      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert([subscriptionData]);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to save subscription');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Upload Subscription Document
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 animate-fade-in">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {!uploadedFile ? (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      Click to upload a subscription document
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF, JPEG, or PNG (max. 10MB)
                    </p>
                  </div>
                </div>
              </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <FileText className="h-5 w-5 text-green-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-green-800">
                          Document Uploaded Successfully
                        </h4>
                        <p className="text-sm text-green-700 mt-1">
                          {uploadedFile.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="subscription-form space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Service Name
                      </label>
                      <input
                        type="text"
                        value={formData.service_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, service_name: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Price
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                          className="block w-full pl-7 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Billing Cycle
                      </label>
                      <select
                        value={formData.billing_cycle}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_cycle: e.target.value as Subscription['billing_cycle'] }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Subscription['category'] }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="streaming">Streaming</option>
                        <option value="music">Music</option>
                        <option value="productivity">Productivity</option>
                        <option value="gaming">Gaming</option>
                        <option value="cloud">Cloud Storage</option>
                        <option value="software">Software</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Next Billing Date
                      </label>
                      <input
                        type="date"
                        value={formData.next_billing_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, next_billing_date: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSubscription}
                        disabled={loading}
                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        {loading ? 'Saving...' : 'Save Subscription'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>

                {loading && (
                  <div className="space-y-2 mt-4">
                    <div className="h-2 bg-gray-200 rounded">
                      {uploadProgress > 0 && <div
                        className="h-2 bg-indigo-600 rounded transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />}
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      {uploadProgress > 0 
                        ? `Uploading... ${uploadProgress}%`
                        : processingText || 'Processing...'}
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
    </div>
  );
}