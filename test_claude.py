import anthropic 

client =anthropic.Anthropic() #finds ANTHROPIC_API_KEY on its own

response = client.messages.create(
    model = "claude-sonnet-5-5",
    max_tokens=200,
    messages = [{
        "role": "user",
        "content": "In two plain sentences, explain what a carry trade is to a college student.",
    }],
)

print(response.content[0].text)
print("Tokens used:", response.usage.input_tokens, "in,", response.usage.output_tokens, "out")