"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Activity,
  Target,
  TrendingUp,
  Camera,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  BarChart3,
  Upload,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react"

export default function Component() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentScore, setCurrentScore] = useState(85)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [websocket, setWebsocket] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [error, setError] = useState<string | null>(null)
  const [isSimulationMode, setIsSimulationMode] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [analysisData, setAnalysisData] = useState({
    stance: { score: 88, status: "良好" },
    balance: { score: 82, status: "需改善" },
    armPosition: { score: 91, status: "優秀" },
    footwork: { score: 79, status: "需改善" },
    timing: { score: 86, status: "良好" },
  })

  const [recentAnalyses] = useState([
    { date: "2024-01-15", score: 85, type: "打擊姿勢" },
    { date: "2024-01-14", score: 78, type: "投球姿勢" },
    { date: "2024-01-13", score: 92, type: "打擊姿勢" },
    { date: "2024-01-12", score: 81, type: "守備姿勢" },
    { date: "2024-01-11", score: 87, type: "打擊姿勢" },
  ])

  // 清理函數
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close()
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
    }
  }, [websocket])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file)
      setError(null)
    } else {
      setError("請選擇有效的影片檔案")
    }
  }

  // 檢查後端連接
  const checkBackendConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch("http://localhost:5000/api/health", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5秒超時
      })
      return response.ok
    } catch (error) {
      console.error("後端連接檢查失敗:", error)
      return false
    }
  }

  // 模擬模式 - 當後端不可用時使用
  const startSimulationMode = () => {
    setIsSimulationMode(true)
    setIsAnalyzing(true)
    setError(null)

    // 模擬骨架分析畫面
    const canvas = document.createElement("canvas")
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext("2d")

    if (ctx) {
      // 繪製模擬的骨架檢測畫面
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, 640, 480)

      // 繪製模擬人體骨架
      ctx.strokeStyle = "#00ff00"
      ctx.lineWidth = 3
      ctx.beginPath()

      // 頭部
      ctx.arc(320, 100, 20, 0, 2 * Math.PI)
      ctx.stroke()

      // 身體主線
      ctx.beginPath()
      ctx.moveTo(320, 120)
      ctx.lineTo(320, 300)
      ctx.stroke()

      // 手臂
      ctx.beginPath()
      ctx.moveTo(320, 160)
      ctx.lineTo(280, 200)
      ctx.lineTo(260, 240)
      ctx.moveTo(320, 160)
      ctx.lineTo(360, 200)
      ctx.lineTo(380, 240)
      ctx.stroke()

      // 腿部
      ctx.beginPath()
      ctx.moveTo(320, 300)
      ctx.lineTo(300, 380)
      ctx.lineTo(290, 460)
      ctx.moveTo(320, 300)
      ctx.lineTo(340, 380)
      ctx.lineTo(350, 460)
      ctx.stroke()

      // 添加文字
      ctx.fillStyle = "#00ff00"
      ctx.font = "20px Arial"
      ctx.fillText("模擬模式 - 骨架檢測", 10, 30)
      ctx.fillText(`評分: ${Math.round(currentScore)}`, 10, 60)

      const imageData = canvas.toDataURL("image/jpeg", 0.8)
      setStreamUrl(imageData)
    }

    // 定期更新模擬數據
    simulationIntervalRef.current = setInterval(() => {
      updateAnalysisData()

      // 重新繪製骨架（添加一些隨機變化）
      if (ctx) {
        ctx.fillStyle = "#1a1a1a"
        ctx.fillRect(0, 0, 640, 480)

        // 添加一些隨機變化到骨架位置
        const offset = Math.sin(Date.now() / 1000) * 5

        ctx.strokeStyle = "#00ff00"
        ctx.lineWidth = 3

        // 重新繪製帶有輕微動畫的骨架
        ctx.beginPath()
        ctx.arc(320 + offset, 100, 20, 0, 2 * Math.PI)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(320 + offset, 120)
        ctx.lineTo(320 + offset, 300)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(320 + offset, 160)
        ctx.lineTo(280 + offset, 200)
        ctx.lineTo(260 + offset, 240)
        ctx.moveTo(320 + offset, 160)
        ctx.lineTo(360 + offset, 200)
        ctx.lineTo(380 + offset, 240)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(320 + offset, 300)
        ctx.lineTo(300 + offset, 380)
        ctx.lineTo(290 + offset, 460)
        ctx.moveTo(320 + offset, 300)
        ctx.lineTo(340 + offset, 380)
        ctx.lineTo(350 + offset, 460)
        ctx.stroke()

        ctx.fillStyle = "#00ff00"
        ctx.font = "20px Arial"
        ctx.fillText("模擬模式 - 骨架檢測", 10, 30)
        ctx.fillText(`評分: ${Math.round(currentScore)}`, 10, 60)
        ctx.fillText("後端服務未連接", 10, 450)

        const imageData = canvas.toDataURL("image/jpeg", 0.8)
        setStreamUrl(imageData)
      }
    }, 100) // 10 FPS
  }

  const uploadVideo = async () => {
    if (!videoFile) return

    setIsUploading(true)
    setError(null)
    setConnectionStatus("connecting")

    // 首先檢查後端連接
    const isBackendAvailable = await checkBackendConnection()

    if (!isBackendAvailable) {
      setConnectionStatus("disconnected")
      setIsUploading(false)
      setError("無法連接到後端服務，啟動模擬模式")

      // 啟動模擬模式
      setTimeout(() => {
        startSimulationMode()
      }, 1000)
      return
    }

    const formData = new FormData()
    formData.append("video", videoFile)

    try {
      setConnectionStatus("connecting")

      // 上傳影片到Flask API
      const response = await fetch("http://localhost:5000/api/upload-video", {
        method: "POST",
        body: formData,
        headers: {
          // 不要設置 Content-Type，讓瀏覽器自動設置
        },
        signal: AbortSignal.timeout(30000), // 30秒超時
      })

      if (response.ok) {
        const result = await response.json()
        console.log("影片上傳成功:", result)
        setConnectionStatus("connected")

        // 建立WebSocket連接接收即時畫面
        const wsUrl = "ws://localhost:5000/socketio/?EIO=4&transport=websocket"
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log("WebSocket連接已建立")
          setWebsocket(ws)
          setIsAnalyzing(true)
          setConnectionStatus("connected")

          // 發送開始分析信號
          ws.send(
            JSON.stringify({
              type: "start_analysis",
              data: { filename: result.filename },
            }),
          )
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "video_frame") {
              setStreamUrl(`data:image/jpeg;base64,${data.data}`)
              updateAnalysisData()
            }
          } catch (error) {
            // 如果不是JSON，可能是直接的base64數據
            setStreamUrl(`data:image/jpeg;base64,${event.data}`)
            updateAnalysisData()
          }
        }

        ws.onerror = (error) => {
          console.error("WebSocket錯誤:", error)
          setError("WebSocket連接錯誤，切換到模擬模式")
          startSimulationMode()
        }

        ws.onclose = () => {
          console.log("WebSocket連接已關閉")
          setIsAnalyzing(false)
          setWebsocket(null)
          setConnectionStatus("disconnected")
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "未知錯誤" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
    } catch (error) {
      console.error("上傳失敗:", error)
      setConnectionStatus("disconnected")

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          setError("請求超時，請檢查網路連接或後端服務")
        } else if (error.message.includes("fetch")) {
          setError("無法連接到後端服務，請確認服務器是否運行在 http://localhost:5000")
        } else {
          setError(`上傳失敗: ${error.message}`)
        }
      } else {
        setError("上傳失敗: 未知錯誤")
      }

      // 啟動模擬模式作為備選方案
      setTimeout(() => {
        startSimulationMode()
      }, 2000)
    } finally {
      setIsUploading(false)
    }
  }

  const stopAnalysis = () => {
    if (websocket) {
      websocket.close()
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current)
      simulationIntervalRef.current = null
    }
    setIsAnalyzing(false)
    setIsSimulationMode(false)
    setStreamUrl(null)
    setConnectionStatus("disconnected")
  }

  const resetAnalysis = () => {
    stopAnalysis()
    setVideoFile(null)
    setStreamUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 模擬更新分析數據
  const updateAnalysisData = () => {
    setAnalysisData((prev) => ({
      stance: {
        score: Math.max(70, Math.min(95, prev.stance.score + (Math.random() - 0.5) * 4)),
        status: prev.stance.score >= 90 ? "優秀" : prev.stance.score >= 80 ? "良好" : "需改善",
      },
      balance: {
        score: Math.max(70, Math.min(95, prev.balance.score + (Math.random() - 0.5) * 4)),
        status: prev.balance.score >= 90 ? "優秀" : prev.balance.score >= 80 ? "良好" : "需改善",
      },
      armPosition: {
        score: Math.max(70, Math.min(95, prev.armPosition.score + (Math.random() - 0.5) * 4)),
        status: prev.armPosition.score >= 90 ? "優秀" : prev.armPosition.score >= 80 ? "良好" : "需改善",
      },
      footwork: {
        score: Math.max(70, Math.min(95, prev.footwork.score + (Math.random() - 0.5) * 4)),
        status: prev.footwork.score >= 90 ? "優秀" : prev.footwork.score >= 80 ? "良好" : "需改善",
      },
      timing: {
        score: Math.max(70, Math.min(95, prev.timing.score + (Math.random() - 0.5) * 4)),
        status: prev.timing.score >= 90 ? "優秀" : prev.timing.score >= 80 ? "良好" : "需改善",
      },
    }))

    setCurrentScore((prev) => Math.max(70, Math.min(95, prev + (Math.random() - 0.5) * 3)))
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 80) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      優秀: "default",
      良好: "secondary",
      需改善: "destructive",
    } as const
    return variants[status as keyof typeof variants] || "secondary"
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="w-4 h-4 text-green-600" />
      case "connecting":
        return <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
      default:
        return <WifiOff className="w-4 h-4 text-red-600" />
    }
  }

  const getConnectionText = () => {
    switch (connectionStatus) {
      case "connected":
        return "已連接"
      case "connecting":
        return "連接中"
      default:
        return "未連接"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">棒球姿勢分析儀表板</h1>
            <p className="text-gray-600 mt-1">即時動作分析與技術改善建議</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <User className="w-4 h-4 mr-1" />
              選手: 張小明
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date().toLocaleDateString("zh-TW")}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {getConnectionIcon()}
              <span className="ml-1">{getConnectionText()}</span>
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-yellow-800">
              {error}
              {isSimulationMode && (
                <div className="mt-2 text-sm">
                  <strong>模擬模式已啟動</strong> - 顯示示例骨架檢測效果
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Real-time Analysis Section */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              即時姿勢分析
              {isSimulationMode && (
                <Badge variant="secondary" className="ml-2">
                  模擬模式
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isSimulationMode ? "模擬MediaPipe骨架分析 (後端服務未連接)" : "上傳影片進行MediaPipe骨架分析"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Analysis Display */}
              <div className="relative">
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                  {streamUrl ? (
                    <img
                      src={streamUrl || "/placeholder.svg"}
                      alt="骨架分析畫面"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-white">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">{isAnalyzing ? "處理中..." : "等待影片上傳"}</p>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-xs">{isSimulationMode ? "模擬中" : "分析中"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Upload and Controls */}
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="video-upload">選擇影片檔案</Label>
                    <Input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      disabled={isAnalyzing}
                    />
                  </div>

                  {videoFile && (
                    <div className="text-sm text-gray-600">
                      已選擇: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}

                  <div className="flex justify-center gap-2">
                    {!isAnalyzing ? (
                      <Button
                        onClick={uploadVideo}
                        disabled={!videoFile || isUploading}
                        className="flex items-center gap-2"
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploading ? "處理中..." : "開始分析"}
                      </Button>
                    ) : (
                      <Button onClick={stopAnalysis} variant="destructive" className="flex items-center gap-2">
                        <Pause className="w-4 h-4" />
                        停止分析
                      </Button>
                    )}

                    <Button variant="outline" onClick={resetAnalysis} className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      重置
                    </Button>
                  </div>
                </div>
              </div>

              {/* Current Analysis */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(currentScore)}`}>{Math.round(currentScore)}</div>
                  <p className="text-gray-600">整體姿勢評分</p>
                </div>

                <div className="space-y-3">
                  {Object.entries(analysisData).map(([key, data]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            data.score >= 90 ? "bg-green-500" : data.score >= 80 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                        ></div>
                        <span className="font-medium">
                          {key === "stance"
                            ? "站姿"
                            : key === "balance"
                              ? "平衡"
                              : key === "armPosition"
                                ? "手臂位置"
                                : key === "footwork"
                                  ? "腳步"
                                  : "時機掌握"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getScoreColor(data.score)}`}>{Math.round(data.score)}</span>
                        <Badge variant={getStatusBadge(data.status)}>{data.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Tabs */}
        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">關鍵指標</TabsTrigger>
            <TabsTrigger value="history">歷史記錄</TabsTrigger>
            <TabsTrigger value="recommendations">改善建議</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">平均評分</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">84.2</div>
                  <p className="text-xs text-muted-foreground">+2.1% 較上週</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">分析次數</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">127</div>
                  <p className="text-xs text-muted-foreground">本月總計</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">改善率</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12%</div>
                  <p className="text-xs text-muted-foreground">較上月提升</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">最佳項目</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">手臂位置</div>
                  <p className="text-xs text-muted-foreground">平均 91 分</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bars */}
            <Card>
              <CardHeader>
                <CardTitle>各項目表現趨勢</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analysisData).map(([key, data]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {key === "stance"
                          ? "站姿"
                          : key === "balance"
                            ? "平衡"
                            : key === "armPosition"
                              ? "手臂位置"
                              : key === "footwork"
                                ? "腳步"
                                : "時機掌握"}
                      </span>
                      <span className="font-medium">{Math.round(data.score)}%</span>
                    </div>
                    <Progress value={data.score} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  最近分析記錄
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAnalyses.map((analysis, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            analysis.score >= 90
                              ? "bg-green-500"
                              : analysis.score >= 80
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        ></div>
                        <div>
                          <p className="font-medium">{analysis.type}</p>
                          <p className="text-sm text-gray-600">{analysis.date}</p>
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${getScoreColor(analysis.score)}`}>{analysis.score}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="grid gap-4">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-5 h-5" />
                    需要改善的項目
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-white rounded border-l-4 border-yellow-400">
                    <h4 className="font-medium text-yellow-800">平衡控制 (82分)</h4>
                    <p className="text-sm text-gray-600 mt-1">建議加強核心肌群訓練，練習單腳站立平衡動作</p>
                  </div>
                  <div className="p-3 bg-white rounded border-l-4 border-yellow-400">
                    <h4 className="font-medium text-yellow-800">腳步移動 (79分)</h4>
                    <p className="text-sm text-gray-600 mt-1">注意重心轉移，練習步伐的節奏和時機</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    表現優秀的項目
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-white rounded border-l-4 border-green-400">
                    <h4 className="font-medium text-green-800">手臂位置 (91分)</h4>
                    <p className="text-sm text-gray-600 mt-1">手臂擺放位置標準，保持現有動作模式</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>訓練建議</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium">每日平衡訓練</h4>
                        <p className="text-sm text-gray-600">進行15分鐘的平衡球訓練</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium">腳步練習</h4>
                        <p className="text-sm text-gray-600">重複練習基本步伐移動</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium">影片回放分析</h4>
                        <p className="text-sm text-gray-600 mt-1">觀看慢動作回放找出問題點</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
