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
   Points to your deployed Cloudflare Worker API proxy. */
const WORKER_URL = "https://orealworker.wufferssss.workers.dev";

/* 3. Display Setting
   Set to true to reset the chat view on each submission so only the user's
   last question and its response are shown (matching the project preview image).
   Set to false if you want a continuous scrolling log of all questions and answers. */
const RESET_DISPLAY_PER_QUESTION = true;

/* 4. System Prompt
   Guides the chatbot to act as a L'Oréal beauty advisor and politely refuse unrelated topics. */
const SYSTEM_PROMPT = `You are the L'Oréal Smart Product Advisor, an expert beauty consultant specializing in L'Oréal Group brands (such as L'Oréal Paris, CeraVe, La Roche-Posay, Maybelline, Lancôme, Garnier, Kérastase, etc.), skincare, haircare, makeup, and fragrances.

Your rules:
1. ONLY answer questions related to L'Oréal products, beauty routines, skincare/haircare advice, and makeup recommendations.
2. Politely refuse any question that is unrelated to L'Oréal or beauty topics (such as general knowledge, coding, math, politics, sports, cooking, etc.).
3. When refusing, be polite and helpful, and redirect the user back to L'Oréal beauty topics. Example refusal: "I'm sorry, but I am specifically trained to assist with L'Oréal products, beauty routines, and skincare recommendations. How can I help you with your beauty routine today?"
4. Keep your answers concise, warm, helpful, and empowering.`;

/* 5. Conversation History
   Maintains all previous turns in the messages array so OpenAI remembers context across questions */
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

/* 6. Helper function to create distinct chat bubbles */
function appendMessage(text, sender, isLoading = false) {
  // Create outer bubble container
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}${isLoading ? " loading" : ""}`;

  // Add distinct label for author clarity
  const label = document.createElement("span");
  label.className = "bubble-label";
  label.textContent = sender === "user" ? "You" : "L'Oréal Advisor";
  bubble.appendChild(label);

  // Add message text container
  const textElement = document.createElement("div");
  textElement.className = "bubble-text";
  textElement.textContent = text;
  bubble.appendChild(textElement);

  // Append bubble to the chat window
  chatWindow.appendChild(bubble);

  // Auto-scroll to ensure latest message is visible
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Return text element for easy updates (e.g. replacing 'Thinking...')
  return textElement;
}

/* 7. Display initial greeting message from the advisor */
appendMessage(
  "👋 Hello! I am your L'Oréal Smart Product Advisor. How can I help you find the right skincare, makeup, or haircare products today?",
  "ai"
);

/* 8. Handle form submission (when the user sends a message) */
chatForm.addEventListener("submit", async (e) => {
  // Prevent page reload
  e.preventDefault();

  // Capture user input and remove extra whitespace
  const userText = userInput.value.trim();
  if (!userText) {
    return;
  }

  // Clear input box
  userInput.value = "";

  // 1. Maintain Conversation History: Add user's question to messages array
  messages.push({
    role: "user",
    content: userText,
  });

  // 2. Reset the display if enabled (so only the user's last question and response appear)
  if (RESET_DISPLAY_PER_QUESTION) {
    chatWindow.innerHTML = "";
  }

  // 3. Display distinct User Bubble (aligned right, above the response)
  appendMessage(userText, "user");

  // 4. Display distinct Assistant Bubble below with temporary loading state
  const loadingElement = appendMessage("Thinking...", "ai", true);

  // Disable controls while waiting for API response
  userInput.disabled = true;
  sendBtn.disabled = true;

  try {
    // Send full conversation history to Cloudflare Worker
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
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Check if OpenAI returned an error object
    if (data.error) {
      throw new Error(data.error.message || "Error from OpenAI API");
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response structure received from API");
    }

    const botReply = data.choices[0].message.content;

    // Remove loading style and display the actual reply
    loadingElement.parentElement.classList.remove("loading");
    loadingElement.textContent = botReply;

    // Maintain Conversation History: Add assistant's reply to messages array
    messages.push({
      role: "assistant",
      content: botReply,
    });
  } catch (error) {
    console.error("Chat error details:", error);
    loadingElement.parentElement.classList.remove("loading");
    loadingElement.textContent =
      `I'm sorry, I encountered an issue: ${error.message}. Please check your Cloudflare Worker configuration.`;
  } finally {
    // Re-enable input and button for the next question
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});
