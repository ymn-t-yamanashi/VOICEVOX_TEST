const VOICEVOX_URL = "http://localhost:50021"; // VOICEVOX EngineのURL

// 要素の取得
const textInput = document.getElementById('text-input');
const speakerSelect = document.getElementById('speaker-select');
const speakButton = document.getElementById('speak-button');
const audioPlayer = document.getElementById('audio-player');

/**
 * テキストを音声に変換して再生します
 */
async function speakText() {
    const text = textInput.value.trim();
    const speakerId = speakerSelect.value;

    if (!text) {
        alert("テキストを入力してください。");
        return;
    }

    speakButton.disabled = true;
    audioPlayer.removeAttribute('src'); // 前の音声をクリア

    try {
        // 1. **音声合成クエリ**の作成 (audio_query)
        const queryParams = new URLSearchParams({
            text: text,
            speaker: speakerId
        });
        const queryUrl = `${VOICEVOX_URL}/audio_query?${queryParams}`;

        const queryResponse = await fetch(queryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!queryResponse.ok) {
            throw new Error(`audio_query failed with status ${queryResponse.status}`);
        }

        const audioQuery = await queryResponse.json();
        
        // 2. **音声合成**の実行 (synthesis)
        const synthesisParams = new URLSearchParams({
            speaker: speakerId
        });
        const synthesisUrl = `${VOICEVOX_URL}/synthesis?${synthesisParams}`;

        const synthesisResponse = await fetch(synthesisUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(audioQuery)
        });

        if (!synthesisResponse.ok) {
            throw new Error(`synthesis failed with status ${synthesisResponse.status}`);
        }

        // 3. **音声データの取得とHTML Audio Playerによる再生**
        const wavBlob = await synthesisResponse.blob();
        
        // Blobから一時的なURLを作成し、audio要素のsrcに設定
        const audioUrl = URL.createObjectURL(wavBlob);
        audioPlayer.src = audioUrl;

        // 再生開始
        await audioPlayer.play();

        // 再生が終了したらボタンを有効に戻す
        audioPlayer.onended = () => {
            speakButton.disabled = false;
        };

    } catch (error) {
        console.error("VOICEVOX APIエラーまたは再生エラー:", error);
        
        let errorMessage = `エラー: VOICEVOX Engineに接続できませんでした。ポート (${VOICEVOX_URL}) を確認してください。`;

        if (error.name === "NotAllowedError") {
            errorMessage = "再生がブロックされました。ブラウザのセキュリティ設定を確認してください。";
        } 
        
        // エラー通知のみ alert で表示
        alert(errorMessage); 
        
        speakButton.disabled = false;
    } 
}