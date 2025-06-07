# Flask後端 - MediaPipe骨架檢測API
# 請在本地環境運行此代碼

import os
import cv2
import numpy as np
import mediapipe as mp
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import base64
import json
from datetime import datetime
import threading
import time

# 初始化Flask應用
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

# MediaPipe初始化
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# 全局變量
analysis_data = {
    "records": [],
    "analysis_count": 0,
    "average_score": 0,
    "best_metric": {"name": "", "score": 0},
    "recommendations": []
}

def analyze_pose_landmarks(landmarks):
    """分析姿勢關鍵點並計算評分"""
    if not landmarks:
        return {
            "overall_score": 0,
            "metrics": {
                "stride_angle": {"score": 0, "status": "無法檢測"},
                "throwing_angle": {"score": 0, "status": "無法檢測"},
                "arm_symmetry": {"score": 0, "status": "無法檢測"},
                "hip_rotation": {"score": 0, "status": "無法檢測"},
                "elbow_height": {"score": 0, "status": "無法檢測"}
            },
            "predict": "無法預測"
        }
    
    # 模擬分析結果（實際應用中應該根據真實的姿勢分析）
    stride_score = np.random.randint(70, 95)
    throwing_score = np.random.randint(65, 90)
    symmetry_score = np.random.randint(75, 95)
    hip_score = np.random.randint(70, 90)
    elbow_score = np.random.randint(80, 95)
    
    overall_score = int(np.mean([stride_score, throwing_score, symmetry_score, hip_score, elbow_score]))
    
    return {
        "overall_score": overall_score,
        "metrics": {
            "stride_angle": {"score": stride_score, "status": "良好"},
            "throwing_angle": {"score": throwing_score, "status": "良好"},
            "arm_symmetry": {"score": symmetry_score, "status": "良好"},
            "hip_rotation": {"score": hip_score, "status": "良好"},
            "elbow_height": {"score": elbow_score, "status": "良好"}
        },
        "predict": "好球" if overall_score > 80 else "壞球"
    }

def process_frame(frame):
    """處理單幀圖像，進行姿勢檢測"""
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_frame)
    
    # 繪製骨架
    annotated_frame = frame.copy()
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            annotated_frame, 
            results.pose_landmarks, 
            mp_pose.POSE_CONNECTIONS,
            mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
            mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
        )
    
    return annotated_frame, results.pose_landmarks

@app.route('/api/upload', methods=['POST'])
def upload_video():
    """處理影片上傳"""
    if 'video' not in request.files:
        return jsonify({"error": "沒有找到影片文件"}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({"error": "沒有選擇文件"}), 400
    
    # 保存影片文件
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"video_{timestamp}.mp4"
    filepath = os.path.join("uploads", filename)
    
    os.makedirs("uploads", exist_ok=True)
    file.save(filepath)
    
    session_id = timestamp
    return jsonify({"session_id": session_id, "message": "影片上傳成功"})

@socketio.on('start_video_analysis')
def handle_video_analysis(data):
    """開始影片分析"""
    session_id = data.get('session_id')
    video_path = f"uploads/video_{session_id}.mp4"
    
    def analyze_video():
        cap = cv2.VideoCapture(video_path)
        frame_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            if frame_count % 5 == 0:  # 每5幀處理一次
                processed_frame, landmarks = process_frame(frame)
                
                # 轉換為base64
                _, buffer = cv2.imencode('.jpg', processed_frame)
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                # 發送處理後的幀
                socketio.emit('video_frame', frame_base64)
                
                # 分析姿勢並發送數據
                analysis_result = analyze_pose_landmarks(landmarks)
                socketio.emit('analysis_data', analysis_result)
                
                time.sleep(0.1)  # 控制發送頻率
        
        cap.release()
        socketio.emit('analysis_complete')
    
    # 在新線程中運行分析
    threading.Thread(target=analyze_video, daemon=True).start()

@socketio.on('start_camera_analysis')
def handle_camera_analysis():
    """開始攝像機分析"""
    print("開始攝像機分析")
    # 這裡應該接收前端的攝像機串流
    # 由於WebSocket限制，這裡提供模擬實現
    
    def simulate_camera_analysis():
        for i in range(100):  # 模擬100幀
            # 創建模擬幀
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, f"Camera Frame {i}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            # 模擬姿勢檢測
            landmarks = True  # 模擬檢測到姿勢
            analysis_result = analyze_pose_landmarks(landmarks)
            
            # 轉換為base64
            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # 發送數據
            socketio.emit('video_frame', frame_base64)
            socketio.emit('analysis_data', analysis_result)
            
            time.sleep(0.1)
    
    threading.Thread(target=simulate_camera_analysis, daemon=True).start()

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """獲取分析統計數據"""
    return jsonify(analysis_data)

@app.route('/api/history', methods=['GET'])
def get_history():
    """獲取歷史記錄"""
    return jsonify({"records": analysis_data["records"]})

@app.route('/api/save-record', methods=['POST'])
def save_record():
    """保存分析記錄"""
    record = request.json
    analysis_data["records"].append(record)
    analysis_data["analysis_count"] += 1
    
    # 更新平均分數
    if analysis_data["records"]:
        total_score = sum(r["score"] for r in analysis_data["records"])
        analysis_data["average_score"] = int(total_score / len(analysis_data["records"]))
    
    # 更新最佳指標
    if record.get("metrics"):
        for metric_name, metric_data in record["metrics"].items():
            if metric_data["score"] > analysis_data["best_metric"]["score"]:
                analysis_data["best_metric"] = {
                    "name": metric_name,
                    "score": metric_data["score"]
                }
    
    return jsonify({"message": "記錄保存成功"})

if __name__ == '__main__':
    print("Flask後端啟動中...")
    print("請確保已安裝以下套件:")
    print("pip install flask flask-socketio flask-cors opencv-python mediapipe numpy")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
