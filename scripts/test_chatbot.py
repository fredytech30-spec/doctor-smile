import time
import json
from urllib import request, error

BASE = 'http://127.0.0.1:8000'

def wait_ready(timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            resp = request.urlopen(f"{BASE}/docs")
            if resp.status == 200:
                print('Server ready')
                return True
        except Exception as e:
            time.sleep(0.5)
    print('Server not ready after timeout')
    return False


def post_chat():
    url = f"{BASE}/chatbot/query"
    payload = {
        "userId": "dev-uid-000",
        "query": "Quel est l'état de trésorerie ?",
        "analysisData": {}
    }
    data = json.dumps(payload).encode('utf-8')
    req = request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', 'Bearer faketoken')
    try:
        resp = request.urlopen(req, timeout=15)
        body = resp.read().decode('utf-8')
        print('CHATBOT RESPONSE STATUS:', resp.status)
        print(body)
    except error.HTTPError as he:
        print('HTTPError', he.code, he.read().decode())
    except Exception as e:
        print('Error posting chatbot:', e)


if __name__ == '__main__':
    if wait_ready(25):
        post_chat()
    else:
        print('Skipping tests.')
