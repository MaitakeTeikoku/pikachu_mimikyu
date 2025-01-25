import React, { useRef, useState, useEffect, useMemo } from "react";
import * as tmImage from "@teachablemachine/image";
import {
  Container, Box,
  Text, Button,
} from "@yamada-ui/react";
import { BarChart, BarProps } from "@yamada-ui/charts";

const threshold = 0.8;
const URL = "https://teachablemachine.withgoogle.com/models/gqDb40TWy/";

const TmImage: React.FC = () => {
  const webcamRef = useRef<tmImage.Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [message, setMessage] = useState<string>("AIモデルを読み込んでいるよ...");
  const [loadingModel, setLoadingModel] = useState<boolean>(true);
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<{ name: string; value: number }[]>([
    { name: "ピカチュウ", value: 0 },
    { name: "ミミッキュ", value: 0 },
  ]);

  // モデルの初期化
  useEffect(() => {
    (async () => {
      const modelURL = `${URL}model.json`;
      const metadataURL = `${URL}metadata.json`;

      try {
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
        setLoadingModel(false);
        setMessage("カメラをオンにしてね！");
      } catch (error) {
        setMessage(`AIモデルの読み込みに失敗しました：${error}`);
      }
    })();
  }, []);

  const series: BarProps[] = useMemo(
    () =>
      [
        { dataKey: "value", color: "primary.500" },
      ],
    [],
  );

  // Webカメラの初期化
  const start = async () => {
    if (model) {
      try {
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
        setIsCameraActive(false);
        setMessage(`カメラの起動に失敗しました：${error}`);
      }
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

      const newPredictions = prediction.map((prediction) => ({
        name: prediction.className,
        value: prediction.probability * 100,
      }));

      // 予測結果を保存
      setPredictions(newPredictions);

      // 確率が最も高いクラスを取得
      const highestPrediction = prediction.reduce((prev, current) =>
        current.probability > prev.probability ? current : prev
      );

      // 閾値以上の場合のみラベルを表示
      if (highestPrediction.probability >= threshold) {
        setMessage(`${highestPrediction.className}`);
      } else {
        setMessage("未検出");
      }
    }
  };

  return (
    <Container centerContent>
      <Text fontSize="xl">
        ピカチュウ or ミミッキュ
      </Text>

      <Text mt="2" fontSize="lg">
        {message}
      </Text>

      <Button
        onClick={start}
        isDisabled={isCameraActive || loadingModel}
        colorScheme="blue"
        mt="2"
      >
        カメラをオンにする
      </Button>

      <Box mt="2" width="100%">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "auto" }}
        />
      </Box>

      <Box mt="2" maxW="100%">
        <BarChart
          data={predictions}
          series={series}
          dataKey="name"
          size="sm"
          unit="%"
          yAxisProps={{ domain: [0, 100], tickCount: 6 }}
          gridAxis="x"
          withTooltip={false}
          referenceLineProps={[{ y: threshold * 100, color: "red.500" }]}
        />
      </Box>
    </Container>
  );
};

export default TmImage;
