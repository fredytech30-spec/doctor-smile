import http.client
import json

print('=== Test simple LLM: Bonsoir qui es-tu ? ===')
conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=120)

payload = json.dumps({
    'userId': 'dev-uid-000',
    'query': "Bonsoir qui es-tu ?",
    'analysisData': {}  # Vide intentionnellement
})

headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer faketoken'
}

conn.request('POST', '/chatbot/query', body=payload, headers=headers)
res = conn.getresponse()
print(f'Status: {res.status}')
body = res.read().decode()
print(f'Response:\n{body}')
