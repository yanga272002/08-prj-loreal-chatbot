/* ==========================================================================
   L'Oréal Smart Product Advisor - script.js
   Beginner-friendly chatbot controller connecting to OpenAI via Cloudflare Worker
   ========================================================================== */

/* 1. DOM Elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

/* 2. Cloudflare Worker URL
   Update this URL to point to your deployed Cloudflare Worker from RESOURCE_cloudflare-worker.js
   NOTE: Never put your OpenAI API key in client-side JavaScript. The Worker safely handles the key. */
const WORKER_URL = "https://loreal-chatbot.your-subdomain.workers.dev/";

/* 3. System Prompt
   Guides the chatbot to act as a L'Oréal beauty advisor and politely refuse unrelated topics. */
const SYSTEM_PROMPT = `You are the L'Oréal Smart Product Advisor, an expert beauty consultant specializing in L'Oréal Group brands (such as L'Oréal Paris, CeraVe, La Roche-Posay, Maybelline, Lancôme, Garnier, Kérastase, etc.), skincare, haircare, makeup, and fragrances.

Your rules:
1. ONLY answer questions related to L'Oréal products, beauty routines, skincare/haircare advice, and makeup recommendations.
2. Politely refuse any question that is unrelated to L'Oréal or beauty topics (such as general knowledge, coding, math, politics, sports, cooking, etc.).
3. When refusing, be polite and helpful, and redirect the user back to L'Oréal beauty topics. Example refusal: "I'm sorry, but I am specifically trained to assist with L'Oréal products, beauty routines, and skincare recommendations. How can I help you with your beauty routine today?"
4. Keep your answers concise, warm, helpful, and empowering.`;

/* 4. Conversation History
   Initialize messages array with the system prompt so the model remembers its role */
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

/* 5. Helper function to append messages to the chat window */
function appendMessage(text, sender) {
  // Create a new paragraph element for the message
  const msgElement = document.createElement("p");
  msgElement.className = `msg ${sender}`;
  msgElement.textContent = text;

  // Add the message to the chat window
  chatWindow.appendChild(msgElement);

  // Auto-scroll to the newest message at the bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return msgElement;
}

/* 6. Display initial greeting message from the advisor */
appendMessage(
  "👋 Hello! I am your L'Oréal Smart Product Advisor. How can I help you find the right skincare, makeup, or haircare products today?",
  "ai"
);

/* 7. Handle form submission (when the user sends a message) */
chatForm.addEventListener("submit", async (e) => {
  // Prevent the default browser form reload
  e.preventDefault();

  // Capture user input and remove extra spaces
  const userText = userInput.value.trim();

  // If the user didn't type anything, exit early
  if (!userText) {
    return;
  }

  // Display user's message in the chat window
  appendMessage(userText, "user");

  // Clear the input box
  userInput.value = "";

  // Add the user message to the conversation history
  messages.push({
    role: "user",
    content: userText,
  });

  // Display a temporary loading message for the assistant
  const loadingElement = appendMessage("Thinking...", "ai");

  // Disable input and button while waiting for response
  userInput.disabled = true;
  sendBtn.disabled = true;

  try {
    // Send request to the Cloudflare Worker proxy
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON returned by the worker
    const data = await response.json();

    // Extract the assistant's reply
    const botReply = data.choices[0].message.content;

    // Update the loading element with the actual reply
    loadingElement.textContent = botReply;

    // Save the reply into conversation history
    messages.push({
      role: "assistant",
      content: botReply,
    });
  } catch (error) {
    console.error("Chat error:", error);
    loadingElement.textContent =
      "I'm sorry, I encountered an issue connecting. Please ensure your Cloudflare Worker URL is configured and running.";
  } finally {
    // Re-enable input and button for the next question
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});
