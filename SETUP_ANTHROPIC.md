# Setup Instructions for ANTHROPIC_API_KEY

To use the "Augment with AI" feature to enhance question answers, you need to configure your Anthropic API key:

## Steps:

1. **Get your API key**:
   - Go to: https://console.anthropic.com/account/keys
   - Create a new API key if you don't have one
   - Copy your API key (starts with `sk-ant-`)

2. **Add to your environment**:
   - Open `.env.local` in the project root
   - Add this line:
     ```
     ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
     ```
   - Replace `sk-ant-your-actual-key-here` with your actual API key

3. **Restart your development server**:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Test it**:
   - Go to the Questions Library (`/library`)
   - Click "✨ Augment all" or individual "Augment with AI" buttons
   - Your questions will be enhanced with:
     - Simple explanations
     - Real-world examples
     - Code examples in JavaScript and Python

## Troubleshooting:

- **Error: "ANTHROPIC_API_KEY is not configured"**: Make sure you've added the key to `.env.local` and restarted your dev server
- **Error: "Could not resolve authentication method"**: Your API key might be invalid or expired. Generate a new one from the Anthropic console
- **Error: "Could not connect to Anthropic"**: Check your internet connection and API quota at https://console.anthropic.com/account/limits
