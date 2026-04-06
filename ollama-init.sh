#!/bin/sh
echo "Waiting for Ollama to be ready..."

for i in $(seq 1 60); do
  if ollama list 2>/dev/null; then
    echo "Ollama is ready!"
    
    # Check if model exists
    if ollama list 2>/dev/null | grep -q "qwen2.5:7b"; then
      echo "Model qwen2.5:7b already exists, skipping pull."
    else
      echo "Pulling qwen2.5:7b model (this may take a while)..."
      ollama pull qwen2.5:7b
      echo "Model downloaded successfully!"
    fi
    exit 0
  fi
  echo "Waiting for Ollama... ($i/60)"
  sleep 5
done

echo "ERROR: Ollama did not start within timeout"
exit 1
