import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import Papa from 'papaparse';
import * as xlsx from 'xlsx';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const app = express();

function setupRoutes() {
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم إرسال أي ملف' });
      }

      const filename = req.file.originalname;
      const language = req.body.language || 'ar';
      let data: any[] = [];

      // 1. قراءة الملف
      if (filename.endsWith('.csv')) {
        const csvString = req.file.buffer.toString('utf-8');
        const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
        data = parsed.data;
      } else if (filename.match(/\.xlsx?$/)) {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        data = xlsx.utils.sheet_to_json(worksheet);
      } else {
        return res.status(400).json({ error: 'صيغة الملف غير مدعومة. يرجى رفع CSV أو Excel' });
      }

      // --- NEW: Data Cleaning ---
      // Limit data to first 5000 rows to prevent event loop blocking and OOM
      if (data.length > 5000) {
        data = data.slice(0, 5000);
      }
      
      // 1. Remove duplicates
      const uniqueData = [];
      const seen = new Set();
      for (const row of data) {
        const rowString = JSON.stringify(row);
        if (!seen.has(rowString)) {
          seen.add(rowString);
          uniqueData.push(row);
        }
      }
      data = uniqueData;

      // 2. Handle missing values and standardize formats
      data = data.map(row => {
        const newRow: any = {};
        for (const key in row) {
          let val = row[key];
          // Standardize empty strings to null
          if (val === '' || val === undefined || val === null) {
            newRow[key] = null;
          } else if (typeof val === 'string') {
            newRow[key] = val.trim(); // Trim whitespace
          } else {
            newRow[key] = val;
          }
        }
        return newRow;
      });

      // --- NEW: Generate Excel File (.xlsx) ---
      const newWorkbook = xlsx.utils.book_new();
      const newWorksheet = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Cleaned Data');
      
      // Write to buffer
      const excelBuffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
      const excelBase64 = excelBuffer.toString('base64');

      // 2. استخراج ملخص البيانات (Metadata)
      const rowCount = data.length;
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      const missingValues: Record<string, number> = {};
      
      columns.forEach(col => { missingValues[col] = 0; });
      
      data.forEach(row => {
        columns.forEach(col => {
          if (row[col] === null || row[col] === undefined || row[col] === '') {
            missingValues[col]++;
          }
        });
      });

      const dataSummary = {
        filename,
        row_count: rowCount,
        column_count: columns.length,
        columns,
        missing_values: missingValues
      };

      // 3. تجهيز الـ Prompt لإرساله إلى Gemini
      const prompt = `
      أنت خبير في تحليل البيانات وعلوم البيانات.
      لقد قمت باستخراج الملخص التالي من ملف بيانات قام المستخدم برفعه:
      ${JSON.stringify(dataSummary, null, 2)}

      بناءً على هذا الملخص، قم بتحليل البيانات وتقديم استجابة بصيغة JSON مهيكلة فقط.
      يجب أن يكون الرد باللغة ${language === 'en' ? 'الإنجليزية (English)' : 'العربية (Arabic)'}.
      يجب أن يحتوي الـ JSON على المفاتيح التالية بالضبط:
      - cleaning_summary: نص يشرح خطوات التنظيف المقترحة بناءً على القيم المفقودة وأنواع البيانات.
      - data_story: قصة البيانات. **يجب** أن تكون حصرياً على شكل قائمة نقطية (Markdown Bullet points). كل نقطة تبدأ بـ "- **عنوان النقطة**: الشرح". لا تكتب أي فقرات تمهيدية أو ختامية، فقط القائمة النقطية.
      - charts: مصفوفة كائنات تحتوي على 4 اقتراحات لرسوم بيانية (شريطي، دائري، مبعثر، خطي). كل كائن يحتوي على:
        - type: نوع الرسم (يجب أن يكون أحد القيم التالية: "bar", "pie", "scatter", "line")
        - title: عنوان الرسم البياني المقترح
        - description: وصف قصير لما يوضحه الرسم
      `;

      // 4. الاتصال بـ Gemini API
      const apiKey = "AIzaSyA9aH1f2l5Qb6CSbgdO6cZKRltb_gjtgJQ";
      if (!apiKey || apiKey.trim() === '') {
        return res.status(500).json({ error: 'مفتاح MY_NEW_KEY غير متوفر أو غير صالح في بيئة الخادم. يرجى التحقق من إعدادات المفتاح.' });
      }

      console.log(`[Upload API] Using API Key. Length: ${apiKey.length}, Starts with: ${apiKey.substring(0, 4)}...`);
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cleaning_summary: { type: Type.STRING },
              data_story: { type: Type.STRING },
              charts: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "bar, pie, scatter, or line" },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["type", "title", "description"]
                } 
              }
            },
            required: ["cleaning_summary", "data_story", "charts"]
          }
        }
      });

      // 5. إرجاع النتيجة
      const resultJson = JSON.parse(response.text || '{}');
      res.json({ ...resultJson, dataSummary, cleaned_excel_base64: excelBase64 });

    } catch (error: any) {
      console.error('Error processing file:', error);
      
      // Extract Gemini API error message if available
      let errorMessage = 'حدث خطأ أثناء المعالجة';
      if (error.message) {
        try {
          // Try to parse the error message if it's a JSON string from Gemini
          const parsedError = JSON.parse(error.message.replace(/^ApiError: /, ''));
          if (parsedError.error && parsedError.error.message) {
            errorMessage = parsedError.error.message;
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, dataSummary, analysisResult, language = 'ar' } = req.body;

      const apiKey = "AIzaSyA9aH1f2l5Qb6CSbgdO6cZKRltb_gjtgJQ";
      if (!apiKey || apiKey.trim() === '') {
        return res.status(500).json({ error: 'مفتاح MY_NEW_KEY غير متوفر أو غير صالح في بيئة الخادم. يرجى التحقق من إعدادات المفتاح.' });
      }

      console.log(`[Chat API] Using API Key. Length: ${apiKey.length}, Starts with: ${apiKey.substring(0, 4)}...`);
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      let systemInstruction = `أنت مساعد ذكي لتحليل البيانات. يجب عليك دائماً الإجابة بنفس اللغة التي يتحدث بها المستخدم. إذا سأل المستخدم بالعربية، أجب بالعربية. وإذا سأل بالإنجليزية، أجب بالإنجليزية. كن احترافياً وواضحاً في إجاباتك.`;
      if (dataSummary) {
        systemInstruction += `\n\nمعلومات عن البيانات الحالية التي قام المستخدم برفعها:\n${JSON.stringify(dataSummary, null, 2)}`;
      }
      if (analysisResult) {
        // Exclude code from analysisResult to save tokens if needed, but it's fine to include
        const { python_code, sql_code, ...restAnalysis } = analysisResult;
        systemInstruction += `\n\nملخص التحليل السابق للبيانات:\n${JSON.stringify(restAnalysis, null, 2)}`;
      }

      const contents = (history || []).map((msg: any) => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error('Error in chat:', error);
      
      let errorMessage = 'حدث خطأ أثناء المحادثة';
      if (error.message) {
        try {
          const parsedError = JSON.parse(error.message.replace(/^ApiError: /, ''));
          if (parsedError.error && parsedError.error.message) {
            errorMessage = parsedError.error.message;
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post('/api/translate', async (req, res) => {
    try {
      const { analysisResult, targetLanguage } = req.body;

      if (!analysisResult) {
        return res.status(400).json({ error: 'No analysis result provided' });
      }

      const apiKey = "AIzaSyA9aH1f2l5Qb6CSbgdO6cZKRltb_gjtgJQ";
      if (!apiKey || apiKey.trim() === '') {
        return res.status(500).json({ error: 'مفتاح MY_NEW_KEY غير متوفر أو غير صالح في بيئة الخادم. يرجى التحقق من إعدادات المفتاح.' });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      const prompt = `
      Translate the following JSON data analysis result into ${targetLanguage === 'en' ? 'English' : 'Arabic'}.
      Maintain the exact same JSON structure, only translate the text values.
      For the 'data_story', keep the markdown bullet point formatting exactly as it is.
      For 'charts', keep the 'type' field exactly as it is (do not translate 'bar', 'pie', 'scatter', 'line'). Translate only 'title' and 'description'.
      
      JSON to translate:
      ${JSON.stringify({
        cleaning_summary: analysisResult.cleaning_summary,
        data_story: analysisResult.data_story,
        charts: analysisResult.charts
      }, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cleaning_summary: { type: Type.STRING },
              data_story: { type: Type.STRING },
              charts: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "bar, pie, scatter, or line" },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["type", "title", "description"]
                } 
              }
            },
            required: ["cleaning_summary", "data_story", "charts"]
          }
        }
      });

      const translatedJson = JSON.parse(response.text || '{}');
      
      // Merge back with non-translated parts like dataSummary and cleaned_excel_base64
      res.json({
        ...analysisResult,
        ...translatedJson
      });

    } catch (error: any) {
      console.error('Error in translate:', error);
      res.status(500).json({ error: error.message || 'Translation failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

  // Global error handler to ensure JSON responses instead of HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت.' });
      }
      return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
    }
    res.status(500).json({ error: err.message || 'حدث خطأ غير متوقع في الخادم' });
  });
}

setupRoutes();
export default app;
