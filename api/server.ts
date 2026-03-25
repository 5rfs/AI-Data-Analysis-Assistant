import express from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import * as xlsx from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// إعداد مفتاح الذكاء الاصطناعي
const genAI = new GoogleGenerativeAI(process.env.MY_NEW_KEY || "");

app.use(express.json());

// نقطة رفع الملفات والتحليل
app.post('/api/upload', upload.single('file'), async (req: any, res: any) => {
  try {
    const apiKey = process.env.MY_NEW_KEY;
    if (!apiKey || apiKey.trim() === "") {
        return res.status(500).json({ error: "API Key is missing in Vercel settings" });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    }

    let dataString = '';

    try {
      if (req.file.originalname.endsWith('.csv')) {
        const csvData = Papa.parse(req.file.buffer.toString('utf-8'), { 
          header: true,
          skipEmptyLines: true 
        });
        if (csvData.errors.length > 0) {
          console.error('CSV Parsing Errors:', csvData.errors);
          return res.status(400).json({ error: 'حدث خطأ أثناء تحليل ملف CSV' });
        }
        dataString = JSON.stringify(csvData.data);
      } else if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(sheet);
        dataString = JSON.stringify(jsonData);
      } else {
        return res.status(400).json({ error: 'نوع ملف غير مدعوم. يرجى رفع ملف CSV أو Excel.' });
      }
    } catch(parseError: any) {
        console.error('File Parsing Error:', parseError);
        return res.status(500).json({ error: `حدث خطأ أثناء معالجة الملف: ${parseError.message}` });
    }

    if (!dataString || dataString === '[]') {
        return res.status(400).json({ error: 'الملف فارغ أو لا يحتوي على بيانات يمكن تحليلها' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
    
    **مهمتك:** أنت محلل بيانات متخصص. قُدمت لك البيانات التالية بصيغة JSON.
    **البيانات:**
    \`\`\`json
    ${dataString.substring(0, 30000)}
    \`\`\`
    
    **المطلوب:**
    1.  **تحليل شامل:** قم بتحليل البيانات المقدمة. ابحث عن الأنماط، العلاقات، الاتجاهات، والقيم الشاذة.
    2.  **استنتاجات رئيسية:** لخص أهم 3-5 استنتاجات يمكنك استخلاصها من البيانات.
    3.  **توصيات (إن أمكن):** بناءً على تحليلك، قدم توصيات عملية أو خطوات تالية مقترحة.
    4.  **تصور مقترح:** صف تصورًا بيانيًا واحدًا (مثل رسم بياني خطي، شريطي، أو دائري) يكون الأكثر فعالية لعرض إحدى النتائج الرئيسية التي توصلت إليها. اذكر ماذا سيمثل كل محور.
    5.  **تنسيق الإجابة:** قدم إجابتك باللغة العربية، واستخدم تنسيق الماركداون (Markdown) لجعلها واضحة ومنظمة (استخدم العناوين، القوائم النقطية، والنص العريض).
    
    ابدأ التحليل الآن.
    `;
    
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysis = response.text();
        res.json({ message: "تم التحليل بنجاح", data: analysis });
    } catch (aiError: any) {
        console.error('AI Generation Error:', aiError);
        res.status(500).json({ error: `حدث خطأ أثناء التواصل مع خدمة الذكاء الاصطناعي: ${aiError.message}` });
    }


  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// هذا السطر مهم جداً لـ Vercel
export default app;