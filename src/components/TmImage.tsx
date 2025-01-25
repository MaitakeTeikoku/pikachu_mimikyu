import React, { useRef, useState, useEffect, useMemo } from "react";
import * as tmImage from "@teachablemachine/image";
import {
  Container, HStack, Box,
  Text, IconButton, Select, Option,
  useNotice,
  is,
} from "@yamada-ui/react";
import { PlayIcon, PauseIcon } from "@yamada-ui/lucide";
import { BarChart, BarProps } from "@yamada-ui/charts";
import { pokedex } from "./Pokedex";

const threshold = 0.9;
const URL = import.meta.env.DEV ? 'http://192.168.11.2:5173/models/' : 'https://maitaketeikoku.github.io/pikachu_mimikyu/models/';

const TmImage: React.FC = () => {
  const notice = useNotice({
    limit: 1,
    isClosable: true,
    placement: "bottom",
  });

  const webcamRef = useRef<tmImage.Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const noticeRef = useRef<string | number | undefined>(undefined)

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
      } catch (e) {
        setMessage(`AIモデルの読み込みに失敗しました：${e}`);
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
        const webcam = new tmImage.Webcam(640, 360, flip); // 幅, 高さ, 反転
        webcamRef.current = webcam;
        await webcam.setup({ deviceId: selectedDeviceId });
        await webcam.play();

        // カメラ映像を描画
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = webcam.width;
          canvas.height = webcam.height;
          webcam.canvas = canvas;
        }

        setIsCameraActive(true);
        window.requestAnimationFrame(loop);

        setMessage("ピカチュウまたはミミッキュを見つけてね！");
      } catch (e) {
        setIsCameraActive(false);
        setMessage(`カメラの起動に失敗しました：${e}`);
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
        //setMessage(`${highestPrediction.className}`);

        const pokeData = pokedex.find((data) => data.name === highestPrediction.className);
        if (!pokeData) {
          return;
        }

        try {
          // 音声合成
          if (!window.speechSynthesis.speaking) {
            const utterance = new SpeechSynthesisUtterance();
            const randomFlavorText = pokeData.flavor_texts_ja[Math.floor(Math.random() * pokeData.flavor_texts_ja.length)];
            utterance.text = `${pokeData.name}、${pokeData.genus}、${randomFlavorText}`;
            utterance.lang = "ja-JP";
            window.speechSynthesis.speak(utterance);
          }
        } catch (e) {
          setMessage(`音声合成に失敗しました：${e}`);
        }

        if (noticeRef.current) {
          notice.update(noticeRef.current, {
            title: pokeData.name,
            description: pokeData.genus,
            status: "info",
          });
        } else {
          noticeRef.current = notice({
            title: pokeData.name,
            description: pokeData.genus,
            status: "info",
          });
        }

      } else {
        if (noticeRef.current) {
          notice.close(noticeRef.current);
          noticeRef.current = undefined;
        }
        //setMessage("未検出");
      }
    }
  };

  const stop = () => {
    setIsCameraActive(false);

    if (webcamRef.current) {
      webcamRef.current.stop();
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <Container centerContent>
      <Text fontSize="lg" mt="2" >
        {message}
      </Text>

      <HStack w="full" maxW="xl" mt="2">
        <Select
          value={selectedDeviceId}
          onChange={setSelectedDeviceId}
          isDisabled={isCameraActive}
          defaultValue={videoDevices[0]?.deviceId}
          placeholderInOptions={false}
          whiteSpace='nowrap'
          overflow='hidden'
          textOverflow='ellipsis'
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

      <Box width="100%" maxW="xl" mt="2">
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
