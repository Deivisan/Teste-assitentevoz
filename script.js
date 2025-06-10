/**
 * Assistente Virtual por Voz - Versão Completa
 * Criado por: Deivisan
 * Data: 10/06/2025
 * GitHub: https://github.com/Deivisan/Teste-assitentevoz
 */

class VoiceAssistant {
    constructor() {
        // Configurações principais
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isProcessing = false;
        this.microphonePermission = false;
        this.textModeActive = false;
        
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
        
        // Histórico de conversas
        this.conversationHistory = [];
        
        // Inicialização
        this.initElements();
        this.showWelcomeModal();
        this.initSpeechRecognition();
        this.bindEvents();
        this.loadSettings();
        this.checkBrowserCompatibility();
        this.startStatusMonitoring();
        this.testConnectionStatus();
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

    enableTextMode() {
        this.textModeActive = true;
        this.textInputArea.style.display = 'block';
        this.toggleTextModeBtn.classList.add('active');
        this.updateCurrentStatus('💬 Modo texto ativo. Digite suas mensagens.', 'ready');
        this.textInput.focus();
    }

    toggleTextMode() {
        this.textModeActive = !this.textModeActive;
        this.textInputArea.style.display = this.textModeActive ? 'block' : 'none';
        
        if (this.textModeActive) {
            this.toggleTextModeBtn.classList.add('active');
            this.updateCurrentStatus('💬 Modo texto ativado', 'ready');
            this.textInput.focus();
        } else {
            this.toggleTextModeBtn.classList.remove('active');
            this.updateCurrentStatus('🎤 Modo voz ativado', 'ready');
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
        this.voiceVolumeSlider?.addEventListener('input', () => this.updateVoiceSettings());
        this.testVoiceBtn?.addEventListener('click', () => this.testVoice());
        this.resetVoiceBtn?.addEventListener('click', () => this.resetVoiceSettings());
        
        // Advanced settings events
        this.languageSelect?.addEventListener('change', () => this.onLanguageChange());
        this.autoSpeakCheck?.addEventListener('change', () => this.updateFeatureSettings());
        this.soundEffectsCheck?.addEventListener('change', () => this.updateFeatureSettings());
        this.showTimestampCheck?.addEventListener('change', () => this.updateFeatureSettings());
        
        // Help events
        this.toggleHelpBtn?.addEventListener('click', () => this.toggleHelpPanel());
        this.floatingHelpBtn?.addEventListener('click', () => this.showQuickHelp());
    }

    loadSettings() {
        // Carregar configurações salvas nos elementos
        if (this.apiProviderSelect) this.apiProviderSelect.value = this.apiProvider;
        if (this.apiKeyInput) this.apiKeyInput.value = this.apiKey;
        if (this.aiModelSelect) this.aiModelSelect.value = this.selectedModel;
        if (this.languageSelect) this.languageSelect.value = this.language;
        
        // Voice settings
        if (this.voiceRateSlider) {
            this.voiceRateSlider.value = this.voiceSettings.rate;
            this.rateDisplay.textContent = this.voiceSettings.rate + 'x';
        }
        if (this.voicePitchSlider) {
            this.voicePitchSlider.value = this.voiceSettings.pitch;
            this.pitchDisplay.textContent = this.voiceSettings.pitch.toFixed(1);
        }
        if (this.voiceVolumeSlider) {
            this.voiceVolumeSlider.value = this.voiceSettings.volume;
            this.volumeDisplay.textContent = Math.round(this.voiceSettings.volume * 100) + '%';
        }
        
        // Feature settings
        if (this.autoSpeakCheck) this.autoSpeakCheck.checked = this.features.autoSpeak;
        if (this.soundEffectsCheck) this.soundEffectsCheck.checked = this.features.soundEffects;
        if (this.showTimestampCheck) this.showTimestampCheck.checked = this.features.showTimestamp;
        
        // Update status based on loaded settings
        this.updateAPIStatus();
    }

    updateAPIStatus() {
        if (this.apiProvider === 'gemini-demo') {
            this.updateApiStatus('🆓 API: Modo Demo');
        } else if (this.apiKey) {
            this.updateApiStatus('🟢 API: Configurada');
        } else {
            this.updateApiStatus('🔴 API: Não configurada');
        }
    }

    startListening() {
        if (!this.recognition) {
            this.updateCurrentStatus('❌ Reconhecimento de voz não disponível', 'error');
            return;
        }

        if (!this.microphonePermission) {
            this.requestMicrophonePermission().then(granted => {
                if (granted) {
                    this.startListening();
                }
            });
            return;
        }

        if (!this.isListening && !this.isProcessing) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Erro ao iniciar reconhecimento:', error);
                this.updateCurrentStatus('❌ Erro ao iniciar reconhecimento de voz', 'error');
            }
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    resetVoiceControls() {
        this.isListening = false;
        this.startListeningBtn.disabled = !this.microphonePermission || (!this.apiKey && this.apiProvider !== 'gemini-demo');
        this.stopListeningBtn.disabled = true;
        this.startListeningBtn.classList.remove('listening');
        
        if (!this.isProcessing) {
            if (this.microphonePermission && (this.apiKey || this.apiProvider === 'gemini-demo')) {
                this.updateCurrentStatus('🎤 Pronto para ouvir! Clique em "Falar".', 'ready');
            } else {
                this.updateCurrentStatus('⚙️ Configure o microfone e API para continuar.', 'warning');
            }
        }
    }

    sendTextMessage() {
        const message = this.textInput.value.trim();
        if (message) {
            this.addMessage(message, 'user');
            this.processUserInput(message);
            this.textInput.value = '';
            this.updateCharCount();
        }
    }

    updateCharCount() {
        const count = this.textInput.value.length;
        this.charCount.textContent = `${count}/500`;
        
        if (count >= 450) {
            this.charCount.style.color = 'var(--primary-red)';
        } else if (count >= 350) {
            this.charCount.style.color = 'var(--primary-yellow)';
        } else {
            this.charCount.style.color = 'var(--text-light)';
        }
    }

    async processUserInput(input) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.updateCurrentStatus('🤖 Processando sua mensagem...', 'processing');
        this.showTypingIndicator();
        
        try {
            const response = await this.getAIResponse(input);
            
            this.hideTypingIndicator();
            this.addMessage(response, 'ai');
            
            if (this.features.autoSpeak && this.synthesis) {
                this.speakText(response);
            }
            
            this.updateCurrentStatus('✅ Resposta recebida!', 'success');
            
            if (this.features.soundEffects) {
                this.playNotificationSound('response');
            }
            
        } catch (error) {
            console.error('Erro ao processar entrada:', error);
            this.hideTypingIndicator();
            
            let errorMessage = '❌ Desculpe, ocorreu um erro ao processar sua mensagem.';
            
            if (error.message.includes('API key')) {
                errorMessage = '🔑 Configure uma chave de API válida nas configurações.';
            } else if (error.message.includes('network')) {
                errorMessage = '🌐 Erro de conexão. Verifique sua internet.';
            } else if (error.message.includes('quota')) {
                errorMessage = '⚠️ Limite de uso da API atingido. Tente novamente mais tarde.';
            }
            
            this.addMessage(errorMessage, 'ai');
            this.updateCurrentStatus('❌ Erro ao processar mensagem', 'error');
            
            if (this.features.soundEffects) {
                this.playNotificationSound('error');
            }
        } finally {
            this.isProcessing = false;
            this.resetVoiceControls();
        }
    }

    async getAIResponse(input) {
        // Adicionar à história da conversa
        this.conversationHistory.push({
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        });

        if (this.apiProvider === 'gemini-demo') {
            return await this.getDemoResponse(input);
        } else if (this.apiProvider === 'gemini' && this.apiKey) {
            return await this.getGeminiResponse(input);
        } else if (this.apiProvider === 'huggingface') {
            return await this.getHuggingFaceResponse(input);
        } else if (this.apiProvider === 'openai' && this.apiKey) {
            return await this.getOpenAIResponse(input);
        } else {
            throw new Error('API não configurada corretamente');
        }
    }

    async getDemoResponse(input) {
        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const responses = [
            `Entendi que você disse: "${input}". Como assistente demo, posso ajudar com perguntas básicas!`,
            `Interessante pergunta sobre "${input}". No modo demo, ofereço respostas simuladas para demonstração.`,
            `Você mencionou "${input}". Este é o modo demo - configure uma API real para respostas mais inteligentes!`,
            `Sobre "${input}" - estou funcionando em modo demonstração. Para melhor experiência, configure sua API do Google AI Studio!`,
            `Recebi sua mensagem: "${input}". Modo demo ativo! Visite https://aistudio.google.com para obter uma chave gratuita.`
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        // Adicionar à história
        this.conversationHistory.push({
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString()
        });
        
        return response;
    }

    async getGeminiResponse(input) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.selectedModel}:generateContent?key=${this.apiKey}`;
        
        // Preparar contexto da conversa
        const context = this.conversationHistory.slice(-10).map(msg => 
            `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`
        ).join('\n');
        
        const prompt = context ? `${context}\nUsuário: ${input}\nAssistente:` : input;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Você é um assistente virtual inteligente e útil. Responda de forma natural, amigável e precisa. Mantenha as respostas concisas mas informativas.\n\n${prompt}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Erro da API Gemini: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Resposta inválida da API Gemini');
        }

        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Adicionar à história
        this.conversationHistory.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
        });
        
        return aiResponse;
    }

    async getHuggingFaceResponse(input) {
        // Usando modelo público da Hugging Face
        const url = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: input,
                parameters: {
                    max_length: 200,
                    temperature: 0.7,
                    do_sample: true
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Erro da API Hugging Face: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Erro da API: ${data.error}`);
        }

        const aiResponse = data[0]?.generated_text || 'Desculpe, não consegui gerar uma resposta adequada.';
        
        // Adicionar à história
        this.conversationHistory.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
        });
        
        return aiResponse;
    }

    async getOpenAIResponse(input) {
        const url = 'https://api.openai.com/v1/chat/completions';
        
        // Preparar mensagens da conversa
        const messages = [
            { role: 'system', content: 'Você é um assistente virtual inteligente e útil. Responda de forma natural, amigável e precisa.' },
            ...this.conversationHistory.slice(-10),
            { role: 'user', content: input }
        ];
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages,
                max_tokens: 1024,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Erro da API OpenAI: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        // Adicionar à história
        this.conversationHistory.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
        });
        
        return aiResponse;
    }

    speakText(text) {
        if (!this.synthesis) return;
        
        // Cancelar fala anterior
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.language;
        utterance.rate = this.voiceSettings.rate;
        utterance.pitch = this.voiceSettings.pitch;
        utterance.volume = this.voiceSettings.volume;
        
        // Tentar encontrar uma voz adequada
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.lang.startsWith(this.language.split('-')[0])
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        utterance.onstart = () => {
            this.updateCurrentStatus('🔊 Falando...', 'speaking');
        };
        
        utterance.onend = () => {
            this.updateCurrentStatus('✅ Pronto para próxima interação', 'ready');
        };
        
        utterance.onerror = (event) => {
            console.error('Erro na síntese de voz:', event.error);
            this.updateCurrentStatus('❌ Erro na síntese de voz', 'error');
        };
        
        this.synthesis.speak(utterance);
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const header = document.createElement('div');
        header.className = 'message-header';
        
        const senderName = document.createElement('strong');
        senderName.textContent = sender === 'user' ? 'Você' : 'Assistente Gemini';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        
        if (this.features.showTimestamp) {
            timestamp.textContent = new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        header.appendChild(senderName);
        header.appendChild(timestamp);
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = text;
        
        content.appendChild(header);
        content.appendChild(messageText);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        const container = this.messages.parentElement;
        container.scrollTop = container.scrollHeight;
    }

    // Status update methods
    updateCurrentStatus(message, type = 'info') {
        if (this.currentStatus) {
            const statusIcon = this.currentStatus.querySelector('.status-icon');
            const statusText = this.currentStatus.querySelector('.status-text');
            
            if (statusIcon && statusText) {
                statusText.textContent = message.replace(/^[🎤🎙️🤖✅❌⚠️🔊⏹️🔴🟢🟡🆓⚙️💬🧪⏳]+\s*/, '');
                
                // Atualizar ícone baseado no tipo
                const icons = {
                    success: '✅',
                    error: '❌',
                    warning: '⚠️',
                    processing: '⏳',
                    listening: '🎙️',
                    speaking: '🔊',
                    ready: '🎤'
                };
                
                statusIcon.textContent = icons[type] || '⏳';
                
                // Atualizar classe CSS
                this.currentStatus.className = `status-display status-${type}`;
            }
        }
    }

    updateMicStatus(message) {
        if (this.micStatus) {
            this.micStatus.textContent = message;
        }
    }

    updateApiStatus(message) {
        if (this.apiStatus) {
            this.apiStatus.textContent = message;
        }
    }

    updateConnectionStatus(message) {
        if (this.connectionStatus) {
            this.connectionStatus.textContent = message;
        }
    }

    // Configuration methods
    showConfigPanel() {
        if (this.configPanel) {
            this.configPanel.style.display = 'block';
            this.toggleConfigBtn.textContent = 'Ocultar';
        }
    }

    toggleConfigPanel() {
        if (this.configPanel) {
            const isVisible = this.configPanel.style.display === 'block';
            this.configPanel.style.display = isVisible ? 'none' : 'block';
            this.toggleConfigBtn.textContent = isVisible ? 'Mostrar' : 'Ocultar';
        }
    }

    toggleHelpPanel() {
        if (this.helpPanel) {
            const isVisible = this.helpPanel.style.display === 'block';
            this.helpPanel.style.display = isVisible ? 'none' : 'block';
            this.toggleHelpBtn.textContent = isVisible ? 'Mostrar' : 'Ocultar';
        }
    }

    onProviderChange() {
        this.apiProvider = this.apiProviderSelect.value;
        localStorage.setItem('voice_assistant_provider', this.apiProvider);
        this.updateAPIStatus();
        this.enableVoiceControls();
    }

    onModelChange() {
        this.selectedModel = this.aiModelSelect.value;
        localStorage.setItem('voice_assistant_model', this.selectedModel);
    }

    onLanguageChange() {
        this.language = this.languageSelect.value;
        localStorage.setItem('voice_assistant_language', this.language);
        
        // Atualizar reconhecimento de voz
        if (this.recognition) {
            this.recognition.lang = this.language;
        }
    }

    toggleApiKeyVisibility() {
        const isPassword = this.apiKeyInput.type === 'password';
        this.apiKeyInput.type = isPassword ? 'text' : 'password';
        this.toggleApiKeyBtn.textContent = isPassword ? '🙈' : '👁️';
    }

    saveConfiguration() {
        this.apiKey = this.apiKeyInput.value.trim();
        this.apiProvider = this.apiProviderSelect.value;
        this.selectedModel = this.aiModelSelect.value;
        this.language = this.languageSelect.value;
        
        // Salvar no localStorage
        localStorage.setItem('voice_assistant_api_key', this.apiKey);
        localStorage.setItem('voice_assistant_provider', this.apiProvider);
        localStorage.setItem('voice_assistant_model', this.selectedModel);
        localStorage.setItem('voice_assistant_language', this.language);
        
        this.updateAPIStatus();
        this.enableVoiceControls();
        
        this.updateCurrentStatus('💾 Configurações salvas com sucesso!', 'success');
        
        if (this.features.soundEffects) {
            this.playNotificationSound('success');
        }
    }

    async testAPI() {
        if (!this.apiKey && this.apiProvider !== 'gemini-demo') {
            this.updateCurrentStatus('⚠️ Configure uma chave de API primeiro', 'warning');
            return;
        }
        
        this.updateCurrentStatus('🧪 Testando API...', 'processing');
        
        try {
            const testResponse = await this.getAIResponse('Olá! Este é um teste de conectividade.');
            this.addMessage('🧪 Teste de API realizado com sucesso!', 'ai');
            this.updateCurrentStatus('✅ API funcionando corretamente!', 'success');
            
            if (this.features.soundEffects) {
                this.playNotificationSound('success');
            }
        } catch (error) {
            console.error('Erro no teste da API:', error);
            this.updateCurrentStatus('❌ Erro no teste da API', 'error');
            this.addMessage(`❌ Erro no teste: ${error.message}`, 'ai');
            
            if (this.features.soundEffects) {
                this.playNotificationSound('error');
            }
        }
    }

    openAPIKeyPage() {
        window.open('https://aistudio.google.com/app/apikey', '_blank');
    }

    // Voice settings methods
    updateVoiceSettings() {
        this.voiceSettings.rate = parseFloat(this.voiceRateSlider.value);
        this.voiceSettings.pitch = parseFloat(this.voicePitchSlider.value);
        this.voiceSettings.volume = parseFloat(this.voiceVolumeSlider.value);
        
        // Atualizar displays
        this.rateDisplay.textContent = this.voiceSettings.rate + 'x';
        this.pitchDisplay.textContent = this.voiceSettings.pitch.toFixed(1);
        this.volumeDisplay.textContent = Math.round(this.voiceSettings.volume * 100) + '%';
        
        // Salvar no localStorage
        localStorage.setItem('voice_rate', this.voiceSettings.rate);
        localStorage.setItem('voice_pitch', this.voiceSettings.pitch);
        localStorage.setItem('voice_volume', this.voiceSettings.volume);
    }

    testVoice() {
        const testText = 'Esta é uma demonstração da voz do assistente virtual. Como está soando?';
        this.speakText(testText);
    }

    resetVoiceSettings() {
        this.voiceSettings = { rate: 0.9, pitch: 1.0, volume: 1.0 };
        
        if (this.voiceRateSlider) this.voiceRateSlider.value = 0.9;
        if (this.voicePitchSlider) this.voicePitchSlider.value = 1.0;
        if (this.voiceVolumeSlider) this.voiceVolumeSlider.value = 1.0;
        
        this.updateVoiceSettings();
        this.updateCurrentStatus('🔄 Configurações de voz resetadas', 'success');
    }

    updateFeatureSettings() {
        this.features.autoSpeak = this.autoSpeakCheck.checked;
        this.features.soundEffects = this.soundEffectsCheck.checked;
        this.features.showTimestamp = this.showTimestampCheck.checked;
        
        // Salvar no localStorage
        localStorage.setItem('auto_speak', JSON.stringify(this.features.autoSpeak));
        localStorage.setItem('sound_effects', JSON.stringify(this.features.soundEffects));
        localStorage.setItem('show_timestamp', JSON.stringify(this.features.showTimestamp));
    }

    // Quick actions
    async runQuickTest() {
        this.updateCurrentStatus('🧪 Executando teste rápido...', 'processing');
        
        const testMessage = 'Teste rápido do assistente virtual';
        this.addMessage(testMessage, 'user');
        await this.processUserInput(testMessage);
    }

    clearChat() {
        if (confirm('Tem certeza que deseja limpar todo o chat?')) {
            // Manter apenas a mensagem de boas-vindas
            const welcomeMessage = this.messages.querySelector('.welcome-message');
            this.messages.innerHTML = '';
            
            if (welcomeMessage) {
                this.messages.appendChild(welcomeMessage);
            }
            
            this.conversationHistory = [];
            this.updateCurrentStatus('🗑️ Chat limpo com sucesso', 'success');
            
            if (this.features.soundEffects) {
                this.playNotificationSound('success');
            }
        }
    }

    downloadChat() {
        const messages = Array.from(this.messages.children)
            .filter(msg => !msg.classList.contains('welcome-message'))
            .map(msg => {
                const sender = msg.classList.contains('user-message') ? 'Usuário' : 'Assistente';
                const text = msg.querySelector('.message-text').textContent;
                const time = msg.querySelector('.timestamp').textContent;
                return `[${time}] ${sender}: ${text}`;
            });
        
        if (messages.length === 0) {
            this.updateCurrentStatus('⚠️ Nenhuma mensagem para salvar', 'warning');
            return;
        }
        
        const content = `Conversa com Assistente de Voz\nData: ${new Date().toLocaleString('pt-BR')}\n\n${messages.join('\n\n')}`;
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversa-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateCurrentStatus('💾 Chat salvo com sucesso!', 'success');
        
        if (this.features.soundEffects) {
            this.playNotificationSound('success');
        }
    }

    // Utility methods
    playNotificationSound(type) {
        if (!this.features.soundEffects) return;
        
        // Criar contexto de áudio simples
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Diferentes frequências para diferentes tipos
        const frequencies = {
            success: [523, 659, 784], // C, E, G
            error: [220, 185, 147],   // A, F#, D
            start: [440, 554],        // A, C#
            received: [659, 784],     // E, G
            response: [784, 659]      // G, E
        };
        
        const freq = frequencies[type] || [440];
        
        oscillator.frequency.setValueAtTime(freq[0], audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    showQuickHelp() {
        const helpTexts = [
            '🎤 Clique em "Falar" para começar uma conversa por voz',
            '💬 Use o modo texto para digitar suas mensagens',
            '⚙️ Configure sua API do Google AI Studio para melhor experiência',
            '🆓 Teste o modo demo sem precisar de chave de API',
            '🔊 Ajuste as configurações de voz na seção de configurações'
        ];
        
        const randomHelp = helpTexts[Math.floor(Math.random() * helpTexts.length)];
        this.addMessage(randomHelp, 'ai');
    }

    startStatusMonitoring() {
        // Monitorar status a cada 30 segundos
        setInterval(() => {
            this.testConnectionStatus();
        }, 30000);
    }

    async testConnectionStatus() {
        try {
            // Teste simples de conectividade
            const response = await fetch('https://www.google.com/favicon.ico', { 
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            this.updateConnectionStatus('🟢 Online');
        } catch (error) {
            this.updateConnectionStatus('🔴 Offline');
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new VoiceAssistant();
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('Erro ao registrar Service Worker:', error);
            });
    });
}