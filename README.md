## React(Vite)プロジェクト構築
1. GitHubからクローン。
    ```sh
    git clone https://github.com/kinakokyoryu/pikachu_mimikyu.git
    ```
1. Reactのプロジェクトを作成。
    ```sh
    npm create vite@latest pikachu_mimikyu
    ```
    ```sh
    Select a framework: » React
    Select a variant: » TypeScript + SWC
    ```
1. ディレクトリの移動。
    ```sh
    cd pikachu_mimikyu
    ```
1. ライブラリをインストール。
    ```sh
    npm install
    ```
    ```sh
    npm i vite-plugin-pwa
    npm i --save-dev @types/node
    npm i @yamada-ui/react @yamada-ui/lucide
    npm i @yamada-ui/charts
    npm i @teachablemachine/image
    ```
1. ローカルで起動。
    ```sh
    npm run dev
    ```
1. クリーンアップ。
    - 以下を削除。
        - src/assets
        - src/index.css
        - src/App.css
        - public/vite.svg
    - public/favicon.icoを追加。
    - src/App.tsxを以下に変更。
        ```tsx
        function App() {

          return (
            <>
            </>
          )
        }

        export default App
        ```
    - index.htmlを以下に変更。（`lang="ja"`、`link href="/favicon.ico"`、`<title></title>`、`viewport-fit=cover`）
        ```html
        <!doctype html>
        <html lang="ja">
          <head>
            <meta charset="UTF-8" />
            <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
            
            <title>ピカチュウ or ミミッキュ</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"></script>
          </body>
        </html>
        ```
    - vite.config.jsのdefineConfig内を以下に変更。（`server: { host: true }`を追記。）
        ```ts
        import { defineConfig } from "vite"
        import react from "@vitejs/plugin-react-swc"

        // https://vite.dev/config/
        export default defineConfig({
          plugins: [react()],
          server: { host: true },
        })
        ```
    - main.tsxを以下に変更。（`import "./index.css"`を削除。）
        ```tsx
        import { StrictMode } from "react"
        import { createRoot } from "react-dom/client"
        import App from "./App.tsx"

        createRoot(document.getElementById("root")!).render(
          <StrictMode>
              <App />
          </StrictMode>
        )
        ```
1. Vite PWAを実装するため、public/logo192.png、public/logo512.pngを追加。
1. Vite PWAを実装するため、vite.config.tsを下記に変更。
    ```ts
    import { defineConfig } from "vite"
    import react from "@vitejs/plugin-react-swc"
    import { VitePWA } from "vite-plugin-pwa"

    // https://vite.dev/config/
    export default defineConfig({
      plugins: [
        react(),
        VitePWA({
          registerType: "autoUpdate",
          includeAssets: ["favicon.ico", "logo192.png"],
          injectRegister: "auto",
          manifest: {
            name: "ピカチュウ or ミミッキュ",
            short_name: "ピカ or ミミ",
            description: "カメラに映るポケモンがピカチュウかミミッキュかをAIが識別します！",
            theme_color: "#141414",
            icons: [
              {
                src: "logo192.png",
                sizes: "192x192",
                type: "image/png"
              },
              {
                src: "logo512.png",
                sizes: "512x512",
                type: "image/png"
              },
              {
                src: "logo512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any"
              },
              {
                src: "logo512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
              }
            ]
          }
        }),
      ],
      server: { host: true },
    })
    ```
1. package.jsonの"scripts"に以下を追記。
    ```json
    "git": "git add . && git commit && git push"
    ```
1. コミットしてプッシュ。
    ```sh
    npm run git
    ```

## Github ActionsでGitHub Pagesにデプロイ
1. vite.config.jsのdefineConfig内を変更。
    ```ts
    export default defineConfig({
      base: process.env.GITHUB_PAGES ? 'REPOSITORY_NAME' : './',
      plugins: [react()],
    })
    ```
1. ブラウザで、Github ActionsでGithub Pagesにデプロイするように設定。
1. .github/workflows/main.ymlを作成し、以下を記述。
    ```yml
    # 静的コンテンツを GitHub Pages にデプロイするためのシンプルなワークフロー
    name: Deploy static content to Pages

    on:
      # デフォルトブランチを対象としたプッシュ時にで実行されます
      push:
        branches: ['main']

      # Actions タブから手動でワークフローを実行できるようにします
      workflow_dispatch:

    # GITHUB_TOKEN のパーミッションを設定し、GitHub Pages へのデプロイを許可します
    permissions:
      contents: read
      pages: write
      id-token: write

    # 1 つの同時デプロイメントを可能にする
    concurrency:
      group: 'pages'
      cancel-in-progress: true

    jobs:
      # デプロイするだけなので、単一のデプロイジョブ
      deploy:
        environment:
          name: github-pages
          url: ${{ steps.deployment.outputs.page_url }}
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4
          - name: Set up Node
            uses: actions/setup-node@v4
            with:
              node-version: 20
              cache: 'npm'
          - name: Install dependencies
            run: npm ci
          - name: Build
            run: npm run build
          - name: Setup Pages
            uses: actions/configure-pages@v4
          - name: Upload artifact
            uses: actions/upload-pages-artifact@v3
            with:
              # dist フォルダーのアップロード
              path: './dist'
          - name: Deploy to GitHub Pages
            id: deployment
            uses: actions/deploy-pages@v4
    ```