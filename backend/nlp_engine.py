import os
import json
import time
from openai import OpenAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Risk(BaseModel):
    risk_type: str = Field(description="The category of the risk, e.g., 'Auto-Renewal', 'Asymmetrical Liability'")
    excerpt: str = Field(description="A short quote from the text demonstrating the risk")
    mitigation_strategy: str = Field(description="A specific, actionable recommendation on how to negotiate or fix this risk")

class Favorability(BaseModel):
    liability: int = Field(description="Score 1-10 (10 = Highly Favorable, 1 = Highly Unfavorable)")
    ip_rights: int = Field(description="Score 1-10")
    financials: int = Field(description="Score 1-10")
    termination: int = Field(description="Score 1-10")
    confidentiality: int = Field(description="Score 1-10")

class Clause(BaseModel):
    clause_type: str = Field(description="The type or name of the clause")
    clause_text: str = Field(description="The text of the clause")

class Metadata(BaseModel):
    Parties: list[str] = Field(description="Names of the companies or individuals entering the agreement")
    Monetary_Values: list[str] = Field(description="Any important monetary values, fees, or compensation mentioned")
    Dates: list[str] = Field(description="Important dates, deadlines, or durations")

class ContractAnalysis(BaseModel):
    overall_risk_score: int = Field(description="A score from 0 to 100 representing the overall danger/risk of the contract. 0 is completely safe, 100 is extremely predatory.")
    favorability: Favorability
    metadata: Metadata
    risks: list[Risk] = Field(description="List of critical or predatory risks found in the contract")
    obligations: list[str] = Field(description="List of the most important strict, binding obligations")
    clauses: list[Clause] = Field(description="List of key clauses categorized by their legal type")
    summary: str = Field(description="A highly accurate, plain-English executive summary of the document")

def analyze_contract(text: str) -> dict:
    if not text.strip():
        return {}
        
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key == "your_openrouter_api_key_here":
        raise Exception("OpenRouter API Key is missing! Please open the .env file in your project folder, paste your API key, and restart the server.")
        
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    
    schema_json = json.dumps(ContractAnalysis.model_json_schema(), indent=2)
    
    prompt = f"""
    You are an expert legal AI assistant. Carefully analyze the following legal contract or text.
    1. Calculate an Overall Risk Score (0-100).
    2. Score the contract's favorability (1-10) across Liability, IP Rights, Financials, Termination, and Confidentiality.
    3. Extract the parties involved, monetary values, and important dates.
    4. Identify any critical or predatory risks and provide an actionable Mitigation Strategy for each.
    5. Extract a list of the most important binding obligations.
    6. Categorize the major clauses.
    7. Provide a 'Plain English Summary'. This must be the simplest form of explanation in the easiest words possible. Explain it like the user has zero legal knowledge and is 10 years old. Do not use any legal jargon.
    
    You MUST output valid JSON that strictly adheres to the following JSON schema:
    {schema_json}
    
    Return ONLY the raw JSON object. Do not include markdown blocks like ```json.
    
    Contract Text:
    {text}
    """
    
    attempt = 0
    while True:
        try:
            response = client.chat.completions.create(
                model='google/gemma-4-26b-a4b-it:free', 
                messages=[
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            break 
        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "429" in error_msg or "502" in error_msg:
                attempt += 1
                sleep_time = min(2 ** attempt, 8)
                print(f"Network issue or High Demand detected. Retrying in {sleep_time} seconds (Attempt {attempt})...")
                time.sleep(sleep_time)
            else:
                raise e 
                
    result_text = response.choices[0].message.content
    
    result_text = result_text.strip()
    if result_text.startswith("```json"):
        result_text = result_text[7:]
    if result_text.startswith("```"):
        result_text = result_text[3:]
    if result_text.endswith("```"):
        result_text = result_text[:-3]
    result_text = result_text.strip()

    result_dict = json.loads(result_text)
    
    if "metadata" in result_dict and "Monetary_Values" in result_dict["metadata"]:
        result_dict["metadata"]["Monetary Values"] = result_dict["metadata"].pop("Monetary_Values")
        
    if "clauses" in result_dict and isinstance(result_dict["clauses"], list):
        formatted_clauses = {}
        for c in result_dict["clauses"]:
            formatted_clauses[c.get("clause_type", "Unknown")] = c.get("clause_text", "")
        result_dict["clauses"] = formatted_clauses
        
    return result_dict
