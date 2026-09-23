# def build_conversation_text(messages):

#     conversation = []

#     for msg in messages:

#         role = msg.get("role")
#         content = msg.get("content")

#         if not content:
#             continue

#         if role == "user":
#             conversation.append(f"Patient: {content}")

#         elif role == "assistant":
#             conversation.append(f"Assistant: {content}")

#     return "\n".join(conversation)

def build_conversation_text(messages):

    conversation = []

    for msg in messages:

        role = msg.get("role")
        content = msg.get("content")

        if not content:
            continue

        # handle list-type content (OpenAI style messages)
        if isinstance(content, list):
            content = " ".join(
                part.get("text", "") for part in content if isinstance(part, dict)
            )

        content = str(content).strip()

        if not content:
            continue

        if role == "user":
            conversation.append(f"Patient: {content}")

        elif role == "assistant":
            conversation.append(f"Assistant: {content}")

    return "\n".join(conversation)