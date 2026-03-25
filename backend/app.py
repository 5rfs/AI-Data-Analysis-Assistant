import os
import json
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

app = Flask(__name__)
# السماح للواجهة الأمامية (React) بالاتصال بالخلفية (Flask)
CORS(app) 

# ==========================================
# إعداد مفتاح API الخاص بـ Gemini
# ==========================================
# يمكنك وضع المفتاح مباشرة هنا (غير محبذ أمنياً) أو قراءته من متغيرات البيئة
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "ضع_مفتاح_API_الخاص_بك_هنا")
genai.configure(api_key=GEMINI_API_KEY)

# إعداد النموذج (نستخدم نموذج flash لسرعته وكفاءته)
model = genai.GenerativeModel('gemini-2.5-flash')

@app.route('/upload', methods=['POST'])
def upload_file():
    # التحقق من وجود ملف في الطلب
    if 'file' not in request.files:
        return jsonify({"error": "لم يتم إرسال أي ملف"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "لم يتم اختيار ملف"}), 400

    try:
        # 1. قراءة الملف باستخدام Pandas بناءً على امتداد الملف
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            return jsonify({"error": "صيغة الملف غير مدعومة. يرجى رفع CSV أو Excel"}), 400

        # 2. استخراج ملخص البيانات (Metadata)
        data_summary = {
            "row_count": int(df.shape[0]),
            "column_count": int(df.shape[1]),
            "columns": df.columns.tolist(),
            "data_types": df.dtypes.astype(str).to_dict(),
            "missing_values": df.isnull().sum().to_dict()
        }

        # 3. تجهيز الـ Prompt لإرساله إلى Gemini
        prompt = f"""
        أنت خبير في تحليل البيانات وعلوم البيانات.
        لقد قمت باستخراج الملخص التالي من ملف بيانات قام المستخدم برفعه:
        {json.dumps(data_summary, ensure_ascii=False, indent=2)}

        بناءً على هذا الملخص، قم بتحليل البيانات وتقديم استجابة بصيغة JSON مهيكلة فقط.
        يجب أن يحتوي الـ JSON على المفاتيح التالية بالضبط:
        {{
            "cleaning_summary": "نص يشرح خطوات التنظيف المقترحة بناءً على القيم المفقودة وأنواع البيانات.",
            "data_story": "قصة قصيرة تشرح ما تعنيه هذه البيانات وكيف يمكن الاستفادة منها في الأعمال.",
            "charts": ["اسم الرسم البياني 1", "اسم الرسم البياني 2", "اسم الرسم البياني 3"],
            "python_code": "كود بايثون باستخدام pandas لتنظيف هذه البيانات تحديداً (معالجة القيم المفقودة، تحويل الأنواع، إلخ).",
            "sql_code": "استعلام SQL مكافئ لتنظيف أو تجميع هذه البيانات."
        }}
        """

        # 4. الاتصال بـ Gemini API وطلب الرد بصيغة JSON
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )

        # 5. تحويل النص العائد إلى كائن JSON وإرساله للواجهة الأمامية
        result_json = json.loads(response.text)
        return jsonify(result_json)

    except Exception as e:
        # معالجة الأخطاء وإرجاعها للواجهة
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # تشغيل الخادم على المنفذ 5000
    print("🚀 جاري تشغيل خادم Flask على المنفذ 5000...")
    app.run(debug=True, port=5000)
