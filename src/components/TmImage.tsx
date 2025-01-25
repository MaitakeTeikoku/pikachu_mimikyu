import React, { useRef, useState, useEffect, useMemo } from "react";
import * as tmImage from "@teachablemachine/image";
import {
  Container, HStack, Box,
  Text, IconButton, Select, Option,
} from "@yamada-ui/react";
import { PlayIcon, PauseIcon } from "@yamada-ui/lucide";
import { BarChart, BarProps } from "@yamada-ui/charts";

const threshold = 0.8;
const URL = "https://teachablemachine.withgoogle.com/models/gqDb40TWy/";

const TmImage: React.FC = () => {
  const webcamRef = useRef<tmImage.Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [message, setMessage] = useState<string>("カメラへのアクセスを許可してね！");
  const [loadingModel, setLoadingModel] = useState<boolean>(true);
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<{ name: string; value: number }[]>([
    { name: "ピカチュウ", value: 0 },
    { name: "ミミッキュ", value: 0 },
  ]);

  // カメラの対応確認と、モデルの初期化
  useEffect(() => {
    (async () => {
      if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        // カメラのアクセス許可を求める
        await navigator.mediaDevices.getUserMedia({ video: true });

        // カメラのデバイス一覧を取得
        const devices = await navigator.mediaDevices.enumerateDevices();
        // ビデオデバイスのみを抽出し、背面カメラを優先してソート
        const videoDevices = devices
          .filter((device) => device.kind === "videoinput")
          .sort((a, b) => {
            const aIsBack = a.label.includes("背面") || a.label.toLowerCase().includes("back");
            const bIsBack = b.label.includes("背面") || b.label.toLowerCase().includes("back");

            if (aIsBack && !bIsBack) return -1;
            if (!aIsBack && bIsBack) return 1;
            return 0;
          });
        setVideoDevices(videoDevices);
        setSelectedDeviceId(videoDevices[0]?.deviceId);
      } else {
        setMessage("このブラウザはカメラに対応していないよ");
        setLoadingModel(false);
        return;
      }

      setMessage("AIモデルを読み込んでいるよ...");

      const modelURL = `${URL}model.json`;
      const metadataURL = `${URL}metadata.json`;

      try {
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
        setLoadingModel(false);
        setMessage("カメラを選んでスタートしてね！");
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
    if (model && videoDevices && selectedDeviceId) {
      try {
        const selectedDevice = videoDevices.find((device) => device.deviceId === selectedDeviceId);
        if (!selectedDevice) {
          setMessage("選択されたカメラが見つかりませんでした。");
          return;
        }

        const isBackCamera = selectedDevice.label.includes("背面") || selectedDevice.label.toLowerCase().includes("back");
        const flip = !isBackCamera;
        const webcam = new tmImage.Webcam(200, 200, flip); // 幅, 高さ, 反転
        webcamRef.current = webcam;
        await webcam.setup({ deviceId: selectedDeviceId });
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

  const stop = () => {
    if (webcamRef.current) {
      webcamRef.current.stop();
    }
    setIsCameraActive(false);
    setMessage("カメラを停止しました");
  };

  return (
    <Container centerContent>
      <Text fontSize="lg" mt="2" >
        {message}
      </Text>

      <HStack mt="2" w="full">
        <Select
          value={selectedDeviceId}
          onChange={setSelectedDeviceId}
          isDisabled={isCameraActive}
          defaultValue={videoDevices[0]?.deviceId}
          placeholderInOptions={false}
        >
          {videoDevices.map((device) => (
            <Option key={device.deviceId} value={device.deviceId}>
              {device.label || "不明なカメラ"}
            </Option>
          ))}
        </Select>

        <IconButton
          icon={isCameraActive ? <PauseIcon /> : <PlayIcon />}
          onClick={isCameraActive ? stop : start}
          isDisabled={loadingModel}
          colorScheme="primary"
        />
      </HStack>

      <Box width="100%" maxW="xl" mt="2">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "auto" }}
        />
      </Box>

      <Box maxW="100%" mt="2">
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
