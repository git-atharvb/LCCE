# LCCE (Legal Contract Clause Extractor)

This is an AI-powered NLP tool that extracts obligations, categorizes clauses, and provides plain-English summaries for dense legal contracts.

## 🚀 How to Run the Application

### Step 1: Start the Backend Server
Open your terminal (PowerShell or Command Prompt) and run the following command to start the Python Flask backend:

```powershell
C:\Users\Atharva\AppData\Local\Programs\Python\Python311\python.exe c:\SoftwareDev\LCCE\backend\app.py
```

*Note: The server will start and you will see `* Running on http://127.0.0.1:5000`. Leave this terminal window open in the background while you use the application.*

### Step 2: Open the Frontend UI
Simply double-click the `index.html` file located in the `frontend` folder to open it in your web browser. 

File Path: `c:\SoftwareDev\LCCE\frontend\index.html`

---

## 🛠️ Setup Instructions (For Future Reference)
*Note: Your environment on this machine is already set up globally! These commands are only necessary if you ever move the project to a new machine.*

1. **Install Python Dependencies:**
```powershell
pip install -r requirements.txt
```

2. **Download NLTK Data:**
*(This happens automatically the first time you run `app.py`, but can be done manually if needed)*
```powershell
python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab'); nltk.download('averaged_perceptron_tagger_eng')"
```
