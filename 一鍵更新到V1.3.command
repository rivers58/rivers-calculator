#!/bin/bash
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Downloads/rivers-calculator"

echo "========================================"
echo " R-CALC V1.3 一鍵更新"
echo "========================================"
echo "來源：$SRC"
echo "目標：$DEST"
echo ""

if [ ! -d "$DEST" ]; then
  echo "找不到目標專案資料夾：$DEST"
  echo "請確認你的 rivers-calculator 在 Downloads 裡。"
  read -p "按 Enter 結束..."
  exit 1
fi

rsync -av --delete \
  --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.vercel' \
  "$SRC/" "$DEST/"

cd "$DEST"
echo ""
echo "安裝/確認套件..."
npm install

echo ""
echo "測試正式版 build..."
npm run build

echo ""
echo "提交並推送到 GitHub..."
git add .
if git diff --cached --quiet; then
  echo "沒有新的變更需要 commit。"
else
  git commit -m "Update R-CALC to V1.3"
fi
git push origin main

echo ""
echo "完成！GitHub 已更新，Vercel 會自動部署。"
echo "等 1～2 分鐘後，iPhone 上重新打開 R-CALC 即可。"
read -p "按 Enter 關閉..."
