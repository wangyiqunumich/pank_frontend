# PanKgraph AI Assistant

## Setup

1. Install dependencies  
   Make sure you have Python 3.9+ installed. Then install the required packages:
   ```
   pip install -r requirements.txt
   ```

2. Configure environment variables  
   Copy the provided example environment file and update it with your own API keys and settings:
   ```
   cp .env.example .env
   ```
   Open .env in your editor and fill in the missing values (e.g., API keys).  

3. Add config.py
   ```
   touch config.py
   ```
   Next, add the following lines:
   ```
   API_KEY='<Your-API-Key>'
   OPENAI_API_KEY=API_KEY
   ```

## Usage

Run the assistant with:
   ```
   python3 ai_assistant.py
   ```

You can review the functions and interfaces in ai_assistant.py and modify them as needed.
