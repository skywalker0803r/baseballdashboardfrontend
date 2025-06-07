"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Upload, RotateCcw, AlertTriangle, Video, StopCircle } from "lucide-react"
import io from "socket.io-client"

// 常數定義
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const ANALYSIS_DURATION = 10000 // 10秒

// 類型定義
interface AnalysisData {
  stride_angle: { score: number; status: string }
  throwing_angle: { score: number; status: string }
  arm_symmetry: { score: number; status: string }
  hip_rotation: { score: number; status: string }
  elbow_height: { score: number; status: string }
}

interface AnalysisRecord {
  timestamp: string
  score: number
  predict: string | null
}

export default function BaseballDashboard() {
  // 狀態管理
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 分析數據
  const [currentScore, setCurrentScore] = useState(0)
  const [predict, setPredict] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    stride_angle: { score: 0, status: "" },
    throwing_angle: { score: 0, status: "" },
    arm_symmetry: { score: 0, status: "" },
    hip_rotation: { score: 0, status: "" },
    elbow_height: { score: 0, status: "" },
  })

  // 統計數據
  const [analysisCount, setAnalysisCount] = useState(0)
  const [averageScore, setAverageScore] = useState(0)
  const [bestMetric, setBestMetric] = useState({ name: "", score: 0 })
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisRecord[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])

  // 媒體相關
  const [streamUrl, setStreamUrl] = useState<string | null>(null)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<any>(null)

  // API 調用函數
  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics`)
      if (response.ok) {
        const data = await response.json()
        setAnalysisCount(data.analysis_count || 0)
        setBestMetric(data.best_metric || { name: "", score: 0 })
        setAverageScore(data.average_score || 0)
        setRecommendations(data.recommendations || [])
      }
    } catch (error) {
      console.error("獲取分析數據失敗:", error)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`)
      if (response.ok) {
        const data = await response.json()
        setRecentAnalyses(data.records || [])
      }
    } catch (error) {
      console.error("獲取歷史記錄失敗:", error)
    }
  }

  const saveAnalysisRecord = async () => {
    try {
      const record = {
        timestamp: new Date().toISOString(),
        score: currentScore,
        metrics: analysisData,
        predict: predict,
      }

      await fetch(`${API_BASE_URL}/api/save-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      })

      fetchHistory()
      fetchAnalyticsData()
    } catch (error) {
      console.error("保存記錄失敗:", error)
    }
  }

  // WebSocket 連接管理
  const initializeSocket = () => {
    if (!socketRef.current) {
      socketRef.current = io(API_BASE_URL)

      socketRef.current.on("video_frame", (data: string) => {
        setStreamUrl(`data:image/jpeg;base64,${data}`)
      })

      socketRef.current.on("analysis_data", (data: any) => {
        setCurrentScore(data.overall_score || 0)
        setAnalysisData(data.metrics || analysisData)
        setPredict(data.predict || null)
      })

      socketRef.current.on("analysis_complete", () => {
        setIsAnalyzing(false)
        saveAnalysisRecord()
      })
    }
  }

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }

  // 媒體處理函數
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
    setStreamUrl(null)
  }

  const startCameraStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        streamRef.current = stream
        setIsCameraActive(true)

        // 發送攝像機串流到後端
        initializeSocket()
        socketRef.current?.emit("start_camera_analysis")
        setIsAnalyzing(true)
      }
    } catch (error) {
      console.error("無法開啟攝像機:", error)
      alert("無法開啟攝像機，請檢查權限設定")
    }
  }

  const uploadVideoFile = async (file: File) => {
    setUploading(true)
    stopCamera()

    const formData = new FormData()
    formData.append("video", file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()

        // 顯示上傳的影片
        const videoUrl = URL.createObjectURL(file)
        if (videoRef.current) {
          videoRef.current.src = videoUrl
          videoRef.current.load()
        }

        // 開始分析
        initializeSocket()
        socketRef.current?.emit("start_video_analysis", { session_id: data.session_id })
        setIsAnalyzing(true)
      }
    } catch (error) {
      console.error("上傳失敗:", error)
      alert("影片上傳失敗，請重試")
    } finally {
      setUploading(false)
    }
  }

  // 事件處理函數
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadVideoFile(file)
    }
  }

  const handleStartCamera = () => {
    startCameraStream()
  }

  const handleStopCamera = () => {
    stopCamera()
    setIsAnalyzing(false)
    disconnectSocket()
  }

  const handleReset = () => {
    stopCamera()
    disconnectSocket()
    window.location.reload()
  }

  // 工具函數
  const getPredictDisplay = () => {
    if (!predict) return { text: "等待分析", color: "text-gray-600" }
    if (predict === "好球") return { text: "好球", color: "text-green-600" }
    return { text: "壞球", color: "text-red-600" }
  }

  const getMetricName = (key: string) => {
    const names: Record<string, string> = {
      stride_angle: "跨步角度",
      throwing_angle: "投擲角度",
      arm_symmetry: "雙手對稱性",
      hip_rotation: "髖部旋轉角度",
      elbow_height: "右手手肘高度",
    }
    return names[key] || key
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("zh-TW")
  }

  // 組件渲染函數
  const renderVideoDisplay = () => (
    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
      {!isAnalyzing && !isCameraActive ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white space-y-4">
            <Camera className="w-12 h-12 mx-auto opacity-50" />
            <p className="text-sm opacity-75">選擇分析方式</p>
            <div className="flex gap-3 justify-center">
              <input type="file" accept="video/*" className="hidden" ref={fileInputRef} onChange={handleVideoUpload} />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "上傳中..." : "上傳影片"}
              </Button>
              <Button onClick={handleStartCamera} className="bg-gray-900 hover:bg-gray-800 text-white">
                <Video className="w-4 h-4 mr-2" />
                開啟攝像機
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {isCameraActive && (
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                LIVE
              </div>
            </div>
          )}
          {streamUrl && (
            <img
              src={streamUrl || "/placeholder.svg"}
              alt="骨架分析"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      )}
    </div>
  )

  const renderAnalysisResults = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl font-bold text-blue-600">{currentScore}</div>
        <p className="text-gray-600">整體姿勢評分</p>
      </div>
      <div className="space-y-3">
        {Object.entries(analysisData).map(([key, data]) => (
          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">{getMetricName(key)}</span>
            <span className="font-bold">{data.score}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderMetricsCards = () => {
    const predictDisplay = getPredictDisplay()

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">平均評分</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}</div>
            {averageScore === 0 && <p className="text-xs text-gray-500">尚無數據</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">分析次數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisCount}</div>
            {analysisCount === 0 && <p className="text-xs text-gray-500">尚無分析</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">好壞球預測</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${predictDisplay.color}`}>{predictDisplay.text}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">最佳項目</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bestMetric.name || "無"}</div>
            {!bestMetric.name && <p className="text-xs text-gray-500">尚無數據</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderHistoryList = () => (
    <div className="space-y-3">
      {recentAnalyses.length > 0 ? (
        recentAnalyses.map((analysis, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{formatDateTime(analysis.timestamp)}</p>
              <p className="text-sm text-gray-600">預測: {analysis.predict || "無"}</p>
            </div>
            <div className="text-lg font-bold">{analysis.score}</div>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">暫無分析記錄</p>
          <p className="text-sm text-gray-400 mt-1">開始您的第一次分析</p>
        </div>
      )}
    </div>
  )

  const renderRecommendations = () => (
    <div>
      {recommendations.length > 0 ? (
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div key={index} className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
              <h4 className="font-medium">{rec.title}</h4>
              <p className="text-sm text-gray-600">{rec.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">暫無改善建議</p>
          <p className="text-sm text-gray-400 mt-1">完成分析後將顯示個人化建議</p>
        </div>
      )}
    </div>
  )

  // 生命週期
  useEffect(() => {
    fetchAnalyticsData()
    fetchHistory()

    return () => {
      stopCamera()
      disconnectSocket()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">棒球姿勢分析儀表板</h1>
          <p className="text-gray-600 mt-1">即時動作分析與技術改善建議</p>
        </div>

        {/* Analysis Section */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              即時姿勢分析
            </CardTitle>
            <CardDescription>上傳影片或開啟攝像機進行MediaPipe骨架分析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative">
                {renderVideoDisplay()}
                <div className="flex justify-center gap-2 mt-4">
                  {isCameraActive && (
                    <Button onClick={handleStopCamera} variant="destructive">
                      <StopCircle className="w-4 h-4 mr-2" />
                      停止攝像機
                    </Button>
                  )}
                  <Button onClick={handleReset} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重置
                  </Button>
                </div>
              </div>
              {renderAnalysisResults()}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">關鍵指標</TabsTrigger>
            <TabsTrigger value="history">歷史記錄</TabsTrigger>
            <TabsTrigger value="recommendations">改善建議</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">{renderMetricsCards()}</TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>最近分析記錄</CardTitle>
              </CardHeader>
              <CardContent>{renderHistoryList()}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  改善建議
                </CardTitle>
              </CardHeader>
              <CardContent>{renderRecommendations()}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
