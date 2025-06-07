"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, Camera, Upload, RotateCcw, AlertTriangle, ThumbsUp, ThumbsDown, Video } from "lucide-react"

// API配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function Component() {
  const [predict, setPredict] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentScore, setCurrentScore] = useState(0)
  const [analysisData, setAnalysisData] = useState({
    stride_angle: { score: 0, status: "" },
    throwing_angle: { score: 0, status: "" },
    arm_symmetry: { score: 0, status: "" },
    hip_rotation: { score: 0, status: "" },
    elbow_height: { score: 0, status: "" },
  })
  const [analysisCount, setAnalysisCount] = useState(0)
  const [bestMetric, setBestMetric] = useState({ name: "", score: 0 })
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([])
  const [averageScore, setAverageScore] = useState(0)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [hasAnalyzed, setHasAnalyzed] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 獲取分析統計數據
  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics`)
      if (response.ok) {
        const data = await response.json()
        setAnalysisCount(data.analysis_count || 0)
        setBestMetric(data.best_metric || { name: "", score: 0 })
        setAverageScore(data.average_score || 0)
        setRecommendations(data.recommendations || [])
        setHasAnalyzed(data.has_analyzed || false)
      }
    } catch (error) {
      console.error("獲取分析數據失敗:", error)
    }
  }

  // 獲取歷史記錄
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

  // 保存分析記錄
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

      setHasAnalyzed(true)
      fetchHistory() // 重新獲取歷史記錄
      fetchAnalyticsData() // 重新獲取統計數據
    } catch (error) {
      console.error("保存記錄失敗:", error)
    }
  }

  // 處理影片上傳
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setIsAnalyzing(true)

    const formData = new FormData()
    formData.append("video", file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        // 開始分析處理
        startAnalysis(data.session_id)
      }
    } catch (error) {
      console.error("上傳失敗:", error)
    } finally {
      setUploading(false)
    }
  }

  // 開啟攝像機
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsAnalyzing(true)
        startAnalysis()
      }
    } catch (error) {
      console.error("無法開啟攝像機:", error)
    }
  }

  // 開始分析
  const startAnalysis = (sessionId?: string) => {
    // 模擬分析過程
    const interval = setInterval(() => {
      setCurrentScore(Math.floor(Math.random() * 30) + 70)
      setAnalysisData({
        stride_angle: { score: Math.floor(Math.random() * 30) + 70, status: "良好" },
        throwing_angle: { score: Math.floor(Math.random() * 30) + 70, status: "良好" },
        arm_symmetry: { score: Math.floor(Math.random() * 30) + 70, status: "良好" },
        hip_rotation: { score: Math.floor(Math.random() * 30) + 70, status: "良好" },
        elbow_height: { score: Math.floor(Math.random() * 30) + 70, status: "良好" },
      })
      setPredict(Math.random() > 0.5 ? "好球" : "壞球")
    }, 1000)

    // 10秒後停止分析並保存記錄
    setTimeout(() => {
      clearInterval(interval)
      setIsAnalyzing(false)
      saveAnalysisRecord()
    }, 10000)
  }

  // 重置
  const handleReset = () => {
    window.location.reload()
  }

  // 獲取預測顯示
  const getPredictDisplay = () => {
    if (!predict) return { text: "預測中", color: "text-gray-600", icon: <Target className="h-4 w-4" /> }
    if (predict === "好球")
      return { text: "好球", color: "text-green-600", icon: <ThumbsUp className="h-5 w-5 text-green-600" /> }
    return { text: "壞球", color: "text-red-600", icon: <ThumbsDown className="h-5 w-5 text-red-600" /> }
  }

  const predictDisplay = getPredictDisplay()

  useEffect(() => {
    fetchAnalyticsData()
    fetchHistory()
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
            <CardDescription>選擇上傳影片或開啟攝像機進行分析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Display */}
              <div className="relative">
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  {!isAnalyzing ? (
                    <div className="text-center text-white space-y-4">
                      <Camera className="w-12 h-12 mx-auto opacity-50" />
                      <p className="text-sm opacity-75">選擇分析方式</p>
                      <div className="flex gap-3 justify-center">
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleVideoUpload}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? "上傳中..." : "上傳影片"}
                        </Button>
                        <Button onClick={startCamera} variant="outline">
                          <Video className="w-4 h-4 mr-2" />
                          開啟攝像機
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <video ref={videoRef} autoPlay className="w-full h-full rounded-lg object-contain" />
                      {streamUrl && (
                        <img
                          src={streamUrl || "/placeholder.svg"}
                          alt="分析畫面"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-center mt-4">
                  <Button onClick={handleReset} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重置
                  </Button>
                </div>
              </div>

              {/* Analysis Results */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">{currentScore}</div>
                  <p className="text-gray-600">整體姿勢評分</p>
                </div>

                <div className="space-y-3">
                  {Object.entries(analysisData).map(([key, data]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">
                        {key === "stride_angle"
                          ? "跨步角度"
                          : key === "throwing_angle"
                            ? "投擲角度"
                            : key === "arm_symmetry"
                              ? "雙手對稱性"
                              : key === "hip_rotation"
                                ? "髖部旋轉角度"
                                : "右手手肘高度"}
                      </span>
                      <span className="font-bold">{data.score}</span>
                    </div>
                  ))}
                </div>
              </div>
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

          <TabsContent value="metrics">
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
                  {!predict && <p className="text-xs text-gray-500">等待分析</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">最佳項目</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bestMetric.name || "無"}</div>
                  {!bestMetric.name && <p className="text-xs text-gray-500">尚無數據</p>}
                  {bestMetric.score > 0 && <p className="text-xs text-gray-500">平均 {bestMetric.score} 分</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>最近分析記錄</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAnalyses.length > 0 ? (
                    recentAnalyses.map((analysis, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(analysis.timestamp).toLocaleString("zh-TW")}</p>
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
              </CardContent>
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
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
