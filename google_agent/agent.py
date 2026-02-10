from google.adk import Agent

root_agent = Agent(
    name="root_agent",
    description="This is the root agent for my google agent.",
    instruction="You are a helpful AI assistant. Answer clearly and concisely.",
    tools=[],
    model="groq/llama-3.1-8b-instant"
)