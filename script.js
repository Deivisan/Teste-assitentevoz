/**
 * Assistente Virtual por Voz - Teste Completo
 * Criado por: Deivisan
 * Data: 10/06/2025
 * GitHub: https://github.com/Deivisan/testes-assistente-de-voz
 */

class VoiceAssistant {
    constructor() {
        // Configurações principais
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isProcessing = false;
        this.microphonePermission = false;
        
        // Configurações salvas
        this.apiKey = localStorage.getItem('voice_assistant_api_key') || '';
        this.apiProvider = localStorage.getItem('voice_assistant_provider') || 'gemini-demo';
        this.selectedModel = localStorage.getItem('voice_assistant_model') || 'gemini-1.5-flash';
        this.language = localStorage.getItem('voice_assistant_language') || 'pt-BR';
        
        // Configurações de voz
        this.voiceSettings = {
            rate: parseFloat(localStorage.getItem('voice_rate')) || 0.9,
            pitch: parseFloat(localStorage.getItem('voice_pitch')) || 1.0,
            volume: parseFloat(localStorage.getItem('voice_volume')) || 1.0
        };
        
        // Configurações de funcionalidades
        this.features = {
            autoSpeak: JSON.parse(localStorage.getItem('auto_speak') || 'true'),
            soundEffects: JSON.parse(localStorage.getItem('sound_effects') || 'true'),
            showTimestamp: JSON.parse(localStorage.getItem('show_timestamp') || 'true')
        };
        
        // Inicialização
        this.initElements();
        this.showWelcomeModal();
        this.initSpeechRecognition();
        this.bindEvents();
        this.loadSettings();
        this.checkBrowserCompatibility();
        this.startStatusMonitoring();
    }

    initElements() {
        // Modal elements
        this.welcomeModal = document.getElementById('welcomeModal');
        this.startWithMicBtn = document.getElementById('startWithMic');
        this.startTextOnlyBtn = document.getElementById('startTextOnly');
        this.configurAPIBtn = document.getElementById('configurAPI');
        
        // Status elements
        this.micStatus = document.getElementById('micStatus');
        this.apiStatus = document.getElementById('apiStatus');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.currentStatus = document.getElementById('currentStatus');
        
        // Chat elements
        this.messages = document.getElementById('messages');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        // Control elements
        this.startListeningBtn = document.getElementById('startListening');
        this.stopListeningBtn = document.getElementById('stopListening');
        this.toggleTextModeBtn = document.getElementById('toggleTextMode');
        
        // Text input elements
        this.textInputArea = document.getElementById('textInputArea');
        this.textInput = document.getElementById('textInput');
        this.sendTextBtn = document.getElementById('sendText');
        this.charCount = document.getElementById('charCount');
        
        // Quick action elements
        this.quickTestBtn = document.getElementById('quickTest');
        this.clearChatBtn = document.getElementById('clearChat');
        this.downloadChatBtn = document.getElementById('downloadChat');
        
        // Config elements
        this.toggleConfigBtn = document.getElementById('toggleConfig');
        this.configPanel = document.getElementById('configPanel');
        this.apiProviderSelect = document.getElementById('apiProvider');
        this.apiKeyInput = document.getElementById('apiKey');
        this.toggleApiKeyBtn = document.getElementById('toggleApiKey');
        this.aiModelSelect = document.getElementById('aiModel');
        this.saveConfigBtn = document.getElementById('saveConfig');
        this.testAPIBtn = document.getElementById('testAPI');
        this.getAPIKeyBtn = document.getElementById('getAPIKey');
        
        // Voice config elements
        this.voiceRateSlider = document.getElementById('voiceRate');
        this.voicePitchSlider = document.getElementById('voicePitch');
        this.voiceVolumeSlider = document.getElementById('voiceVolume');
        this.rateDisplay = document.getElementById('rateDisplay');
        this.pitchDisplay = document.getElementById('pitchDisplay');
        this.volumeDisplay = document.getElementById('volumeDisplay');
        this.testVoiceBtn = document.getElementById('testVoice');
        this.resetVoiceBtn = document.getElementById('resetVoice');
        
        // Advanced config elements
        this.languageSelect = document.getElementById('language');
        this.autoSpeakCheck = document.getElementById('autoSpeak');
        this.soundEffectsCheck = document.getElementById('soundEffects');
        this.showTimestampCheck = document.getElementById('showTimestamp');
        
        // Help elements
        this.toggleHelpBtn = document.getElementById('toggleHelp');
        this.helpPanel = document.getElementById('helpPanel');
        this.floatingHelpBtn = document.getElementById('floatingHelp');
        this.helpTooltip = document.getElementById('helpTooltip');
    }

    showWelcomeModal() {
        this.welcomeModal.classList.add('show');
    }

    hideWelcomeModal() {
        this.welcomeModal.classList.remove('show');
        setTimeout(() => {
            this.welcomeModal.style.display = 'none';
        }, 300);
    }

    async requestMicrophonePermission() {
        try {
            this.updateCurrentStatus('🎤 Solicitando permissão do microfone...', 'processing');
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            this.microphonePermission = true;
            this.updateMicStatus('🟢 Microfone: Autorizado');
            this.updateCurrentStatus('✅ Microfone autorizado com sucesso!', 'success');
            this.enableVoiceControls();
            
            if (this.features.soundEffects) {
                this.playNotificationSound('success');
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao solicitar permissão do microfone:', error);
            this.microphonePermission = false;
            this.updateMicStatus('🔴 Microfone: Negado');
            this.updateCurrentStatus('❌ Permissão de microfone negada', 'error');
            
            if (this.features.soundEffects) {
                this.playNotificationSound('error');
            }
            
            return false;
        }
    }

    enableVoiceControls() {
        if (this.microphonePermission && (this.apiKey || this.apiProvider === 'gemini-demo')) {
            this.startListeningBtn.disabled = false;
            this.updateCurrentStatus('🎤 Pronto para ouvir! Clique em "Falar" para começar.', 'ready');
        }
    }

    checkBrowserCompatibility() {
        const compatibility = {
            speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            speechSynthesis: 'speechSynthesis' in window,
            mediaDevices: 'mediaDevices' in navigator,
            isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost'
        };
        
        let issues = [];
        
        if (!compatibility.speechRecognition) {
            issues.push('Reconhecimento de voz não suportado');
        }
        
        if (!compatibility.speechSynthesis) {
            issues.push('Síntese de voz não suportada');
        }
        
        if (!compatibility.mediaDevices) {
            issues.push('Acesso ao microfone não disponível');
        }
        
        if (!compatibility.isHTTPS) {
            issues.push('HTTPS necessário para funcionalidade completa');
        }
        
        if (issues.length > 0) {
            this.updateConnectionStatus('⚠️ Limitações detectadas');
            this.addMessage(`⚠️ Aviso: ${issues.join(', ')}. Algumas funcionalidades podem não funcionar corretamente.`, 'ai');
        } else {
            this.updateConnectionStatus('🟢 Totalmente compatível');
        }
        
        return compatibility;
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configurações do reconhecimento
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = this.language;
            this.recognition.maxAlternatives = 1;
            
            // Event listeners
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateCurrentStatus('🎙️ Ouvindo... Fale agora!', 'listening');
                this.startListeningBtn.disabled = true;
                this.stopListeningBtn.disabled = false;
                this.startListeningBtn.classList.add('listening');
                
                if (this.features.soundEffects) {
                    this.playNotificationSound('start');
                }
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                console.log(`Reconhecido: "${transcript}" (Confiança: ${(confidence * 100).toFixed(1)}%)`);
                
                this.addMessage(transcript, 'user');
                this.processUserInput(transcript);
                
                if (this.features.soundEffects) {
                    this.playNotificationSound('received');
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Erro no reconhecimento de fala:', event.error);
                
                let errorMsg = 'Erro no reconhecimento de fala';
                let statusClass = 'error';
                
                switch(event.error) {
                    case 'not-allowed':
                        errorMsg = '❌ Permissão de microfone negada';
                        this.microphonePermission = false;
                        this.updateMicStatus('🔴 Microfone: Negado');
                        break;
                    case 'no-speech':
                        errorMsg = '🤫 Nenhuma fala detectada. Tente novamente.';
                        statusClass = 'warning';
                        break;
                    case 'audio-capture':
                        errorMsg = '🎤 Erro no microfone. Verifique se está conectado.';
                        break;
                    case 'network':
                        errorMsg = '🌐 Erro de conexão. Verifique sua internet.';
                        break;
                    case 'aborted':
                        errorMsg = '⏹️ Reconhecimento cancelado';
                        statusClass = 'warning';
                        break;
                }
                
                this.updateCurrentStatus(errorMsg, statusClass);
                this.resetVoiceControls();
                
                if (this.features.soundEffects && event.error !== 'aborted') {
                    this.playNotificationSound('error');
                }
            };
            
            this.recognition.onend = () => {
                this.resetVoiceControls();
            };
        } else {
            this.updateCurrentStatus('❌ Reconhecimento de voz não suportado neste navegador', 'error');
            this.addMessage('Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Firefox mais recentes para melhor experiência.', 'ai');
        }
    }

    bindEvents() {
        // Welcome modal events
        this.startWithMicBtn?.addEventListener('click', async () => {
            const granted = await this.requestMicrophonePermission();
            if (granted) {
                this.hideWelcomeModal();
                this.updateCurrentStatus('🎤 Microfone configurado! Configure uma API ou teste o modo demo.', 'success');
            }
        });
        
        this.startTextOnlyBtn?.addEventListener('click', () => {
            this.hideWelcomeModal();
            this.enableTextMode();
            this.updateCurrentStatus('💬 Modo texto ativo. Digite suas mensagens abaixo.', 'success');
        });
        
        this.configurAPIBtn?.addEventListener('click', () => {
            this.hideWelcomeModal();
            this.showConfigPanel();
            this.updateCurrentStatus('⚙️ Configure sua API para começar a usar o assistente.', 'ready');
        });
        
        // Voice control events
        this.startListeningBtn?.addEventListener('click', () => this.startListening());
        this.stopListeningBtn?.addEventListener('click', () => this.stopListening());
        this.toggleTextModeBtn?.addEventListener('click', () => this.toggleTextMode());
        
        // Text input events
        this.sendTextBtn?.addEventListener('click', () => this.sendTextMessage());
        this.textInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendTextMessage();
            }
        });
        this.textInput?.addEventListener('input', () => this.updateCharCount());
        
        // Quick action events
        this.quickTestBtn?.addEventListener('click', () => this.runQuickTest());
        this.clearChatBtn?.addEventListener('click', () => this.clearChat());
        this.downloadChatBtn?.addEventListener('click', () => this.downloadChat());
        
        // Config events
        this.toggleConfigBtn?.addEventListener('click', () => this.toggleConfigPanel());
        this.apiProviderSelect?.addEventListener('change', () => this.onProviderChange());
        this.toggleApiKeyBtn?.addEventListener('click', () => this.toggleApiKeyVisibility());
        this.aiModelSelect?.addEventListener('change', () => this.onModelChange());
        this.saveConfigBtn?.addEventListener('click', () => this.saveConfiguration());
        this.testAPIBtn?.addEventListener('click', () => this.testAPI());
        this.getAPIKeyBtn?.addEventListener('click', () => this.openAPIKeyPage());
        
        // Voice settings events
        this.voiceRateSlider?.addEventListener('input', () => this.updateVoiceSettings());
        this.voicePitchSlider?.addEventListener('input', () => this.updateVoiceSettings());