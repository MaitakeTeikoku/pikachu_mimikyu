import React, { useRef, useState } from "react";
import * as tmImage from "@teachablemachine/image";
import { Button, Card, Text, Container } from "@yamada-ui/react";

const TmImage: React.FC = () => {
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [maxPredictions, setMaxPredictions] = useState<number>(0);
  const [label, setLabel] = useState<string>("未検出");
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const webcamRef = useRef<tmImage.Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const URL = "./models/";
  const threshold = 0.8;

  // モデルとWebカメラの初期化
  const init = async () => {
    try {
      const modelURL = `${URL}model.json`;
      const metadataURL = `${URL}metadata.json`;

      // モデルとメタデータをロード
      const loadedModel = await tmImage.load(modelURL, metadataURL);
      setModel(loadedModel);
      setMaxPredictions(loadedModel.getTotalClasses());

      // Webカメラの設定
      const flip = true; // カメラを反転
      const webcam = new tmImage.Webcam(200, 200, flip); // 幅, 高さ, 反転
      webcamRef.current = webcam;
      await webcam.setup(); // カメラへのアクセス許可
      await webcam.play();

      // カメラ映像を描画
      const canvas = canvasRef.current;
      if (canvas) {
        webcam.canvas = canvas;
      }

      setIsCameraActive(true);
      window.requestAnimationFrame(loop);
    } catch (error) {
      console.error("エラー:", error);
    }
  };

  // Webカメラのフレームループ
  const loop = async () => {
    if (webcamRef.current && model) {
      webcamRef.current.update(); // Webカメラのフレーム更新
      await predict();
      window.requestAnimationFrame(loop);
    }
  };

  // 推論処理
  const predict = async () => {
    if (webcamRef.current && model) {
      const prediction = await model.predict(webcamRef.current.canvas);

      // 確率が最も高いクラスを取得
      const highestPrediction = prediction.reduce((prev, current) =>
        current.probability > prev.probability ? current : prev
      );

      // 閾値以上の場合のみラベルを表示
      if (highestPrediction.probability >= threshold) {
        setLabel(
          `${highestPrediction.className}: ${highestPrediction.probability.toFixed(2)}`
        );
      } else {
        setLabel("未検出");
      }
    }
  };

  return (
    <Container p="4" centerContent>
      <Text fontSize="2xl" fontWeight="bold" mb="4">
        ピカチュウ?ミミッキュ?
      </Text>
      <Text fontSize="lg" mb="4">
        ピカチュウかミミッキュか判別します
      </Text>
      <Button
        onClick={init}
        isDisabled={isCameraActive}
        colorScheme="blue"
        mb="4"
      >
        Start
      </Button>
      <Card shadow="md" borderRadius="lg" p="4">
        <canvas
          ref={canvasRef}
          style={{ border: "1px solid black", width: "100%", height: "auto" }}
        />
      </Card>
      <Text mt="4" fontSize="lg" color="gray.700">
        {label}
      </Text>
    </Container>
  );
};

export default TmImage;
