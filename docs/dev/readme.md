```sh
brew install caddy
caddy run

curl localhost:2019/load -H "Content-Type: application/json" -d @caddy.json
curl localhost:2019/config/
```
