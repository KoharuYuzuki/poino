# poino

## なかの人がいないテキスト読み上げソフトウェア
通常の音声合成ソフトウェアにはなかの人 (声優さん) がいますが、poinoはフォルマント合成を行うため、なかの人がいません。  
エンベロープからフォルマントを計算し、逆フーリエ変換で声を合成しています。

## ビルド
ビルド環境はmacOSのみを想定しています。

1. リポジトリをクローンします。
```
$ git clone https://github.com/KoharuYuzuki/poino.git
$ cd poino
```

2. Dictionary for Open JTalk version 1.11 (UTF-8) と HTS voice version 1.05 をダウンロード・展開し、次の場所に配置します。
```
./openjtalk/open_jtalk_dic_utf_8-1.11
./openjtalk/hts_voice_nitech_jp_atr503_m001-1.05
```

3. [openjtalk-wasm](https://github.com/KoharuYuzuki/openjtalk-wasm)をビルドし、openjtalk.jsとopenjtalk.wasmを次の場所に配置します。
```
./openjtalk/openjtalk.js
./openjtalk/openjtalk.wasm
```

4. 次のコマンドを実行します。
```
$ npm install
$ npm install --prefix renderer
$ ./build.sh
```

5. `./dist`にビルドされたソフトウェアが出力されます。
