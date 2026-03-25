import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Bot, 
  Send, 
  BarChart2, 
  Sparkles, 
  CheckCircle2, 
  LayoutDashboard, 
  Database,
  Loader2,
  AlertCircle,
  MessageSquare,
  LineChart,
  Download,
  PieChart,
  Map as MapIcon,
  Monitor,
  ScatterChart
} from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

type DataSummary = {
  filename: string;
  row_count: number;
  column_count: number;
  columns: string[];
  missing_values: Record<string, number>;
};

type ChartSuggestion = {
  type: string;
  title: string;
  description: string;
};

type AnalysisResult = {
  cleaning_summary: string;
  data_story: string;
  charts: ChartSuggestion[];
  dataSummary?: DataSummary;
  cleaned_excel_base64?: string;
};

const translations = {
  ar: {
    appTitle: 'مساعد تحليل البيانات الذكي',
    chatTitle: 'مساعد التحليل',
    chatDesc: 'اسألني أي شيء عن بياناتك، وسأقوم بتحليلها وإعطائك إجابات دقيقة.',
    chatPlaceholder: 'اسأل عن بياناتك...',
    uploadTitle: 'قم برفع ملف البيانات',
    uploadDesc: 'يدعم ملفات Excel و CSV',
    processing: 'جاري المعالجة...',
    dataOverview: 'نظرة عامة على البيانات',
    dataStory: 'قصة البيانات',
    chartSuggestions: 'اقتراحات الرسوم البيانية',
    designInspiration: 'تغذية بصرية لتصميم الداشبورد',
    cleaningStatus: 'حالة تنظيف البيانات',
    downloadCleaned: 'تحميل الملف المنظف',
    downloadReport: 'تحميل التقرير',
    analyzeNew: 'تحليل ملف جديد',
    colorInspiration: 'استلهام الألوان',
    rows: 'صفوف',
    columns: 'أعمدة',
    missingValues: 'قيم مفقودة',
    duplicates: 'تكرارات',
    welcomeMessage: 'مرحباً! أنا مساعدك الذكي لتحليل البيانات. قم برفع ملف (Excel أو CSV) لنبدأ في استخراج الرؤى وتنظيف البيانات معاً.',
    systemAnalyzing: 'جاري تحليل ملف "{filename}"... أقوم الآن بفحص البيانات وتنظيفها.',
    serverError: 'الخادم قيد التشغيل أو يتم تحديثه. يرجى الانتظار بضع ثوانٍ والمحاولة مرة أخرى.',
    networkError: 'فشل الاتصال بالخادم بعد عدة محاولات.',
    uploadError: 'عذراً، حدث خطأ أثناء معالجة الملف: {error}',
    chatError: 'عذراً، حدث خطأ أثناء معالجة رسالتك.',
    dashboardInspirationTitle: 'تغذية بصرية لتصميم الداشبورد',
    uploadPrompt: 'ارفع بياناتك للتحليل',
    uploadPromptDesc: 'اسحب وأفلت ملف Excel أو CSV هنا، أو انقر للاستعراض',
    secureProtected: 'آمن ومحمي',
    instantAnalysis: 'تحليل فوري بالذكاء الاصطناعي',
    processingTitle: 'جاري معالجة البيانات...',
    processingDesc: 'يقوم الذكاء الاصطناعي بفحص البيانات واستخراج الأنماط المخفية.',
    analysisSuccess: 'تم التحليل بنجاح',
    clearData: 'تم مسح البيانات السابقة. يمكنك رفع ملف جديد للبدء من جديد.',
    downloadCleanedFile: 'تحميل البيانات المنظفة (.xlsx)',
    viewDetails: 'عرض التفاصيل',
    darkModern: 'تصميم داكن وحديث',
    darkModernDesc: 'مثالي للبيانات المالية والمؤشرات الحيوية، يقلل من إجهاد العين.',
    cleanMinimal: 'واجهة نظيفة ومشرقة',
    cleanMinimalDesc: 'مناسبة للتقارير الطبية والتعليمية، تركز على وضوح الأرقام.',
    softSaaS: 'أسلوب الـ SaaS المرن',
    softSaaSDesc: 'يعتمد على المساحات البيضاء والرسوم البيانية التفاعلية البسيطة.',
    highDensity: 'كثافة بيانات عالية',
    highDensityDesc: 'تصميم معقد للوحات تحكم التداول والمراقبة اللحظية (Real-time).',
    aiAssistant: 'مساعد الذكاء الاصطناعي',
    onlineReady: 'متصل وجاهز',
    serverConnectionFailed: 'فشل الاتصال بالخادم',
    invalidServerResponse: 'استجاب الخادم ببيانات غير صالحة',
    uploadErrorGeneric: 'حدث خطأ أثناء رفع الملف',
    serverErrorStatus: 'خطأ في الخادم ({status})',
    analysisCompleteMsg: 'اكتمل التحليل! لقد قمت بتنظيف البيانات واستخراج أهم الرؤى واقتراحات التصميم. يمكنك الاطلاع عليها في لوحة التحليل، أو سؤالي عن أي تفاصيل إضافية.'
  },
  en: {
    appTitle: 'Smart Data Analysis Assistant',
    chatTitle: 'Analysis Assistant',
    chatDesc: 'Ask me anything about your data, and I will analyze it and give you accurate answers.',
    chatPlaceholder: 'Ask about your data...',
    uploadTitle: 'Upload Data File',
    uploadDesc: 'Supports Excel and CSV files',
    processing: 'Processing...',
    dataOverview: 'Data Overview',
    dataStory: 'Data Story',
    chartSuggestions: 'Chart Suggestions',
    designInspiration: 'Dashboard Design Inspiration',
    cleaningStatus: 'Data Cleaning Status',
    downloadCleaned: 'Download Cleaned File',
    downloadReport: 'Download Report',
    analyzeNew: 'Analyze New File',
    colorInspiration: 'Color Inspiration',
    rows: 'Rows',
    columns: 'Columns',
    missingValues: 'Missing Values',
    duplicates: 'Duplicates',
    welcomeMessage: 'Hello! I am your smart data analysis assistant. Upload a file (Excel or CSV) to start extracting insights and cleaning data together.',
    systemAnalyzing: 'Analyzing file "{filename}"... I am now inspecting and cleaning the data.',
    serverError: 'Server is starting or updating. Please wait a few seconds and try again.',
    networkError: 'Failed to connect to the server after multiple attempts.',
    uploadError: 'Sorry, an error occurred while processing the file: {error}',
    chatError: 'Sorry, an error occurred while processing your message.',
    dashboardInspirationTitle: 'Dashboard Design Inspiration',
    uploadPrompt: 'Upload your data for analysis',
    uploadPromptDesc: 'Drag and drop an Excel or CSV file here, or click to browse',
    secureProtected: 'Secure and Protected',
    instantAnalysis: 'Instant AI Analysis',
    processingTitle: 'Processing Data...',
    processingDesc: 'AI is scanning data and extracting hidden patterns.',
    analysisSuccess: 'Analysis Successful',
    clearData: 'Previous data cleared. You can upload a new file to start over.',
    downloadCleanedFile: 'Download Cleaned Data (.xlsx)',
    viewDetails: 'View Details',
    darkModern: 'Dark & Modern Design',
    darkModernDesc: 'Ideal for financial data and vital indicators, reduces eye strain.',
    cleanMinimal: 'Clean & Minimal Interface',
    cleanMinimalDesc: 'Suitable for medical and educational reports, focuses on number clarity.',
    softSaaS: 'Soft SaaS Style',
    softSaaSDesc: 'Relies on white space and simple interactive charts.',
    highDensity: 'High Data Density',
    highDensityDesc: 'Complex design for trading dashboards and real-time monitoring.',
    aiAssistant: 'AI Assistant',
    onlineReady: 'Online and Ready',
    serverConnectionFailed: 'Failed to connect to the server',
    invalidServerResponse: 'Server responded with invalid data',
    uploadErrorGeneric: 'An error occurred while uploading the file',
    serverErrorStatus: 'Server Error ({status})',
    analysisCompleteMsg: 'Analysis complete! I have cleaned the data and extracted key insights and design suggestions. You can view them in the dashboard or ask me any further questions.'
  }
};

const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 6, delayMs = 3000, lang: 'ar' | 'en' = 'ar'): Promise<Response> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Clone the response to read the text without consuming the original body
      const clonedResponse = response.clone();
      const text = await clonedResponse.text();
      
      // Check if the response is the AI Studio loading HTML page
      if (text.includes('<!doctype html>') || text.includes('<html')) {
        console.warn(`[Retry ${i + 1}/${maxRetries}] Received HTML loading page from server. Retrying in ${delayMs}ms...`);
        if (i === maxRetries - 1) {
          throw new Error(translations[lang].serverError);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue; // Retry
      }
      
      // If it's not HTML, return the original response
      return response;
    } catch (error: any) {
      // If it's a network error (e.g., connection refused during restart), retry
      console.warn(`[Retry ${i + 1}/${maxRetries}] Network error: ${error.message}. Retrying in ${delayMs}ms...`);
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(translations[lang].networkError);
};

const renderMockChart = (chartType: string) => {
  const type = chartType.toLowerCase();
  
  if (type === 'bar') {
    return (
      <div className="flex items-end justify-around w-full h-full pt-4 pb-2 px-2 gap-2 relative">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none py-2">
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
        </div>
        <div className="w-full bg-blue-500 rounded-t-sm h-[40%] relative z-10 hover:bg-blue-600 transition-colors"></div>
        <div className="w-full bg-indigo-500 rounded-t-sm h-[75%] relative z-10 hover:bg-indigo-600 transition-colors"></div>
        <div className="w-full bg-sky-400 rounded-t-sm h-[55%] relative z-10 hover:bg-sky-500 transition-colors"></div>
        <div className="w-full bg-blue-600 rounded-t-sm h-[90%] relative z-10 hover:bg-blue-700 transition-colors"></div>
        <div className="w-full bg-indigo-400 rounded-t-sm h-[30%] relative z-10 hover:bg-indigo-500 transition-colors"></div>
      </div>
    );
  }
  
  if (type === 'pie') {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="w-32 h-32 rounded-full relative shadow-sm hover:scale-105 transition-transform" style={{
          background: 'conic-gradient(#3b82f6 0% 35%, #6366f1 35% 60%, #38bdf8 60% 85%, #818cf8 85% 100%)'
        }}>
          {/* Donut hole for modern look */}
          <div className="absolute inset-0 m-auto w-16 h-16 bg-white rounded-full shadow-inner"></div>
        </div>
      </div>
    );
  }
  
  if (type === 'line') {
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden px-2">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none py-2">
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
        </div>
        <svg viewBox="0 0 100 50" className="w-full h-full relative z-10 overflow-visible" preserveAspectRatio="none">
          {/* Gradient fill under the line */}
          <path d="M0,45 Q15,35 25,40 T50,20 T75,25 T100,10 L100,50 L0,50 Z" fill="url(#lineGradient)" opacity="0.3" />
          {/* The line itself */}
          <path d="M0,45 Q15,35 25,40 T50,20 T75,25 T100,10" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
        {/* Data points */}
        <div className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full z-20 hover:scale-150 transition-transform" style={{ left: '25%', top: '78%' }}></div>
        <div className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full z-20 hover:scale-150 transition-transform" style={{ left: '50%', top: '38%' }}></div>
        <div className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full z-20 hover:scale-150 transition-transform" style={{ left: '75%', top: '48%' }}></div>
        <div className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full z-20 hover:scale-150 transition-transform" style={{ left: '98%', top: '18%' }}></div>
      </div>
    );
  }
  
  if (type === 'scatter') {
    return (
      <div className="relative w-full h-full px-2 py-2">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none py-2">
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
          <div className="border-b border-slate-400 w-full h-1/4"></div>
        </div>
        <div className="absolute w-3 h-3 bg-blue-500 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '15%', top: '75%' }}></div>
        <div className="absolute w-2 h-2 bg-indigo-500 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '25%', top: '55%' }}></div>
        <div className="absolute w-4 h-4 bg-sky-400 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '35%', top: '65%' }}></div>
        <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '45%', top: '35%' }}></div>
        <div className="absolute w-3.5 h-3.5 bg-indigo-400 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '55%', top: '25%' }}></div>
        <div className="absolute w-2 h-2 bg-sky-500 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '65%', top: '45%' }}></div>
        <div className="absolute w-4 h-4 bg-blue-500 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '75%', top: '15%' }}></div>
        <div className="absolute w-3 h-3 bg-indigo-600 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '85%', top: '35%' }}></div>
        <div className="absolute w-2.5 h-2.5 bg-sky-400 rounded-full opacity-70 hover:opacity-100 hover:scale-150 transition-all" style={{ left: '90%', top: '10%' }}></div>
      </div>
    );
  }

  // Default fallback (similar to bar)
  return (
    <div className="flex items-end justify-around w-full h-full pt-4 pb-2 px-2 gap-2">
      <div className="w-full bg-slate-300 rounded-t-sm h-[40%]"></div>
      <div className="w-full bg-slate-400 rounded-t-sm h-[70%]"></div>
      <div className="w-full bg-slate-300 rounded-t-sm h-[50%]"></div>
      <div className="w-full bg-slate-400 rounded-t-sm h-[90%]"></div>
    </div>
  );
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: translations['ar'].welcomeMessage }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const getChartIcon = (chartType: string, className: string = "w-8 h-8 text-blue-400 mx-auto mb-3") => {
    const type = chartType.toLowerCase();
    if (type === 'pie') return <PieChart className={className} />;
    if (type === 'line') return <LineChart className={className} />;
    if (type === 'scatter') return <ScatterChart className={className} />;
    if (type === 'map') return <MapIcon className={className} />;
    return <BarChart2 className={className} />;
  };

  const getChartEnglishName = (chartType: string) => {
    const type = chartType.toLowerCase();
    if (type === 'pie') return 'PIE CHART';
    if (type === 'line') return 'LINE CHART';
    if (type === 'scatter') return 'SCATTER PLOT';
    if (type === 'map') return 'MAP CHART';
    return 'BAR CHART';
  };

  const formatDataStory = (text: string) => {
    if (!text) return null;
    
    // Pre-process text to ensure it's ALWAYS a bulleted list
    const blocks = text.split(/\n\n+/).filter(block => block.trim() !== '');
    
    const formattedText = blocks.map(block => {
      let cleanBlock = block.trim();
      
      // Check if the block is already a list (bulleted or numbered)
      const isListBlock = cleanBlock.split('\n').some(line => {
        const l = line.trim();
        return l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l);
      });
      
      if (isListBlock) {
         return cleanBlock.split('\n').map(line => {
           let l = line.trim();
           // Convert numbered list to bullet
           if (/^\d+\.\s/.test(l)) return l.replace(/^\d+\.\s/, '- ');
           // Ensure continuation lines are indented so they belong to the bullet
           if (l && !l.startsWith('- ') && !l.startsWith('* ')) return `  ${l}`; 
           return l;
         }).join('\n');
      }
      
      // If it's a paragraph, make it a single bullet point
      cleanBlock = cleanBlock.replace(/\n/g, ' ');
      return `- ${cleanBlock}`;
    }).join('\n\n');

    return (
      <div className="text-slate-300 text-[15px] leading-[2.2] text-start">
        <Markdown 
          remarkPlugins={[remarkGfm]}
          components={{
            ul: ({node, ...props}) => <ul className="space-y-6 mb-4" {...props} />,
            ol: ({node, ...props}) => <ul className="space-y-6 mb-4" {...props} />, // Force ol to ul styling
            li: ({node, children, ...props}) => (
              <li className="relative ps-6" {...props}>
                <span className="absolute start-0 top-[11px] w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <div className="inline-block">{children}</div>
              </li>
            ),
            p: ({node, ...props}) => <span className="inline" {...props} />,
            strong: ({node, ...props}) => <strong className="text-amber-200 font-bold" {...props} />
          }}
        >
          {formattedText}
        </Markdown>
      </div>
    );
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatTyping]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (chatMessages.length === 1 && chatMessages[0].id === '1') {
      setChatMessages([{ id: '1', role: 'ai', content: translations[language].welcomeMessage }]);
    }
  }, [language]);

  const handleLanguageChange = async (newLang: 'ar' | 'en') => {
    if (language === newLang) return;
    setLanguage(newLang);

    if (analysisResult) {
      setIsTranslating(true);
      try {
        const response = await fetchWithRetry('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            analysisResult,
            targetLanguage: newLang
          })
        }, 3, 2000, newLang);

        if (response.ok) {
          const translatedResult = await response.json();
          setAnalysisResult(translatedResult);
        }
      } catch (error) {
        console.error('Translation failed:', error);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setAnalysisComplete(false);
    
    // Add system message
    setChatMessages(prev => [...prev, { 
      id: crypto.randomUUID(), 
      role: 'ai', 
      content: translations[language].systemAnalyzing.replace('{filename}', selectedFile.name)
    }]);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('language', language);

      const response = await fetchWithRetry('/api/upload', {
        method: 'POST',
        body: formData
      }, 6, 3000, language);

      if (!response.ok) {
        let errorMessage = translations[language].uploadErrorGeneric;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response as JSON');
          errorMessage = translations[language].serverErrorStatus.replace('{status}', response.status.toString());
        }
        throw new Error(errorMessage);
      }

      const resultText = await response.text();
      let resultData: AnalysisResult;

      try {
        const parsedResponse = JSON.parse(resultText);
        
        // The server sends back an object with a 'data' property containing the AI's markdown string.
        // The UI expects a structured `AnalysisResult` object.
        // To bridge this and prevent a crash, we will create a valid `AnalysisResult` object.
        // We will place the entire markdown response into the `data_story` field.
        // We will provide an empty array for `charts` to prevent the `.map()` error.
        resultData = {
          data_story: parsedResponse.data || "No analysis data returned.",
          cleaning_summary: parsedResponse.cleaning_summary || "", // Provide a safe default
          charts: Array.isArray(parsedResponse.charts) ? parsedResponse.charts : [], // This prevents the crash
          dataSummary: parsedResponse.dataSummary, // Pass this through if it exists
          cleaned_excel_base64: parsedResponse.cleaned_excel_base64 // Pass this through
        };
      } catch (e) {
        console.error('Failed to parse API response as JSON:', resultText.substring(0, 500));
        // If the response is not JSON, it might be a plain error string from the server or proxy.
        // We'll display it as the main story and ensure other fields are safe.
        resultData = {
          data_story: "### Server Response\n\nThe server returned an unexpected response that could not be displayed as a structured analysis. Here is the raw output:\n\n```\n" + resultText + "\n```",
          cleaning_summary: "",
          charts: [],
        };
      }
      
      setAnalysisResult(resultData);
      
      setIsProcessing(false);
      setAnalysisComplete(true);
      setChatMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        content: translations[language].analysisCompleteMsg
      }]);

    } catch (error: any) {
      console.error(error);
      setIsProcessing(false);
      setFile(null);
      setChatMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        content: translations[language].uploadError.replace('{error}', error.message)
      }]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    const newUserMsg: Message = { id: crypto.randomUUID(), role: 'user', content: userMessage };
    
    // We only send the history excluding the new message to the backend
    const currentHistory = [...chatMessages];
    
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatTyping(true);

    try {
      const response = await fetchWithRetry('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          history: currentHistory,
          dataSummary: analysisResult?.dataSummary,
          analysisResult: analysisResult,
          language: language
        })
      }, 6, 3000, language);

      if (!response.ok) {
        let errorMessage = translations[language].serverConnectionFailed;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Failed to parse chat error response as JSON');
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse chat success response as JSON:', responseText.substring(0, 200));
        throw new Error(translations[language].invalidServerResponse);
      }
      
      setChatMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        content: data.reply || (language === 'en' ? 'Sorry, I could not understand that.' : 'عذراً، لم أتمكن من فهم ذلك.') 
      }]);
    } catch (error: any) {
      console.error(error);
      setChatMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        content: error.message || translations[language].chatError
      }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${language === 'ar' ? 'border-r' : 'border-l'} border-slate-800`}>
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md shrink-0 relative">
          <div className="flex items-center gap-3 text-indigo-400">
            <Database className="w-6 h-6" />
            <h1 className="text-xl font-bold text-slate-100">{translations[language].appTitle}</h1>
          </div>
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700/50 backdrop-blur-sm">
            <button 
              onClick={() => handleLanguageChange('ar')}
              disabled={isTranslating}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${language === 'ar' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'} ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              عربي
            </button>
            <button 
              onClick={() => handleLanguageChange('en')}
              disabled={isTranslating}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${language === 'en' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'} ${isTranslating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              English
            </button>
          </div>
          
          <div className="w-[200px]"></div> {/* Spacer to balance the flex layout */}
        </header>

        <main className="flex-1 overflow-y-auto p-6 relative">
          
          {/* Translation Loading Overlay */}
          {isTranslating && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-200 font-medium">
                  {language === 'ar' ? 'جاري ترجمة التحليل...' : 'Translating analysis...'}
                </p>
              </div>
            </div>
          )}

          {/* State 1: Upload File */}
          {!file && !isProcessing && !analysisComplete && (
            <div className="h-full flex items-center justify-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl"
              >
                <div 
                  className="border-2 border-dashed border-slate-700 rounded-3xl p-12 text-center bg-slate-900/50 hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all cursor-pointer group"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  />
                  <div className="w-20 h-20 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-3">{translations[language].uploadPrompt}</h2>
                  <p className="text-slate-400 mb-6">{translations[language].uploadPromptDesc}</p>
                  <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {translations[language].secureProtected}</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {translations[language].instantAnalysis}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* State 2: Processing Animation */}
          {isProcessing && (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center max-w-md text-center">
                <div className="relative w-32 h-32 mb-8">
                  {/* Outer spinning ring */}
                  <motion.div 
                    className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-indigo-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                  {/* Inner pulsing icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <FileSpreadsheet className="w-12 h-12 text-indigo-400" />
                    </motion.div>
                  </div>
                  {/* Scanning beam */}
                  <motion.div 
                    className="absolute left-0 right-0 h-1 bg-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] rounded-full"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">{translations[language].processingTitle}</h3>
                <p className="text-slate-400 animate-pulse">{translations[language].processingDesc}</p>
              </div>
            </div>
          )}

          {/* State 3: Analysis Dashboard */}
          {analysisComplete && analysisResult && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-6 pb-10"
            >
              {/* File Info Header */}
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-100">{file?.name || 'data.csv'}</h2>
                    <p className="text-sm text-slate-400">{(file?.size ? (file.size / 1024).toFixed(2) : '15.4')} KB • {translations[language].analysisSuccess}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { 
                    setFile(null); 
                    setAnalysisComplete(false); 
                    setAnalysisResult(null); 
                    setChatMessages([{ id: crypto.randomUUID(), role: 'ai', content: translations[language].clearData }]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {translations[language].analyzeNew}
                </button>
              </div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Data Story */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">{translations[language].dataStory}</h3>
                  </div>
                  <div className="h-[calc(100%-4rem)] overflow-y-auto pe-2" dir="auto">
                    {formatDataStory(analysisResult.data_story)}
                  </div>
                </div>

                {/* Data Cleaning Status */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">{translations[language].cleaningStatus}</h3>
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex-1 flex flex-col">
                    <div className="prose prose-invert prose-sm max-w-none mb-4 flex-1" dir="auto">
                      <Markdown>{analysisResult.cleaning_summary}</Markdown>
                    </div>
                    {analysisResult.cleaned_excel_base64 && (
                      <button
                        onClick={() => {
                          try {
                            const byteCharacters = atob(analysisResult.cleaned_excel_base64!);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            const url = URL.createObjectURL(blob);
                            
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `cleaned_${analysisResult.dataSummary?.filename.replace(/\.[^/.]+$/, "") || 'data'}.xlsx`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Error downloading Excel file:', error);
                            alert(language === 'ar' ? 'حدث خطأ أثناء تحميل الملف. يرجى المحاولة مرة أخرى.' : 'An error occurred while downloading the file. Please try again.');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium text-sm shadow-sm mt-auto"
                      >
                        <Download className="w-4 h-4" />
                        {translations[language].downloadCleanedFile}
                      </button>
                    )}
                  </div>
                </div>

                  {/* Dashboard Layouts */}
                  <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <LayoutDashboard className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-100">{translations[language].chartSuggestions}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {analysisResult.charts?.map((chart, idx) => (
                        <div key={idx} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center hover:border-blue-500/50 transition-colors flex flex-col items-center justify-center">
                          {getChartIcon(chart.type, "w-8 h-8 text-blue-400 mx-auto mb-1")}
                          <span className="text-[10px] text-amber-400 uppercase tracking-widest mb-3 font-mono">{getChartEnglishName(chart.type)}</span>
                          <h4 className="font-bold text-slate-200 mb-2" dir="auto">{chart.title}</h4>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dashboard Design Inspiration Gallery */}
                  <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-100">{translations[language].dashboardInspirationTitle}</h3>
                    </div>
                    
                    {/* Gallery Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      
                      {/* Card 1: Dark & Modern */}
                      <a href="https://dribbble.com/search/dark-mode-dashboard" target="_blank" rel="noopener noreferrer" className="block group relative rounded-xl overflow-hidden cursor-pointer border border-slate-700/50 bg-slate-800/30 transition-all hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] flex flex-col">
                        <div className="aspect-video overflow-hidden relative">
                          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" alt="Dark Modern Dashboard" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">{translations[language].colorInspiration}</span>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-center">
                          <h4 className="text-slate-200 font-bold text-sm mb-1.5">{translations[language].darkModern}</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">{translations[language].darkModernDesc}</p>
                        </div>
                      </a>

                      {/* Card 2: Clean & Minimal */}
                      <a href="https://www.behance.net/search/projects?search=Clean+Dashboard+UI" target="_blank" rel="noopener noreferrer" className="block group relative rounded-xl overflow-hidden cursor-pointer border border-slate-700/50 bg-slate-800/30 transition-all hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col">
                        <div className="aspect-video overflow-hidden relative">
                          <img src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=2076&auto=format&fit=crop" alt="Clean Medical Dashboard" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">{translations[language].viewDetails}</span>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-center">
                          <h4 className="text-slate-200 font-bold text-sm mb-1.5">{translations[language].cleanMinimal}</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">{translations[language].cleanMinimalDesc}</p>
                        </div>
                      </a>

                      {/* Card 3: Neumorphism / Soft */}
                      <a href="https://www.pinterest.com/search/pins/?q=Data%20Analytics%20Dashboard" target="_blank" rel="noopener noreferrer" className="block group relative rounded-xl overflow-hidden cursor-pointer border border-slate-700/50 bg-slate-800/30 transition-all hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col">
                        <div className="aspect-video overflow-hidden relative">
                          <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop" alt="Soft UI Dashboard" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">استلهام الألوان</span>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-center">
                          <h4 className="text-slate-200 font-bold text-sm mb-1.5">{translations[language].softSaaS}</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">{translations[language].softSaaSDesc}</p>
                        </div>
                      </a>

                      {/* Card 4: High Density / Analytical */}
                      <a href="https://dribbble.com/search/trading-dashboard" target="_blank" rel="noopener noreferrer" className="block group relative rounded-xl overflow-hidden cursor-pointer border border-slate-700/50 bg-slate-800/30 transition-all hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] flex flex-col">
                        <div className="aspect-video overflow-hidden relative">
                          <img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop" alt="High Density Dashboard" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">{translations[language].viewDetails}</span>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-center">
                          <h4 className="text-slate-200 font-bold text-sm mb-1.5">{translations[language].highDensity}</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">{translations[language].highDensityDesc}</p>
                        </div>
                      </a>

                    </div>
                  </div>
                </motion.div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-slate-500">
            Developed by Hassan Abdullah Alsuhayyih © 2026
          </div>
        </main>
      </div>

      {/* Sidebar Chatbot */}
      <div className="w-full md:w-[400px] h-1/2 md:h-full flex flex-col bg-slate-900 border-l border-slate-800 shrink-0 z-10 shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">{translations[language].aiAssistant}</h2>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {translations[language].onlineReady}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
          <AnimatePresence initial={false}>
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex w-full ${msg.role === 'user' ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm shadow-sm"
                  }`}
                >
                  <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-invert prose-slate'}`} dir="auto">
                    <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                  </div>
                </div>
              </motion.div>
            ))}
            {isChatTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full justify-end"
              >
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </AnimatePresence>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={translations[language].chatPlaceholder}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 transition-all placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isProcessing}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Send className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
