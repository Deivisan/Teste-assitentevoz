class DeiviTechAI {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.isProcessing = false;
        this.recognition = null;
        this.voices = [];
        this.currentProvider = 'huggingface';
        
        // API Configuration - Using free tiers
        this.apiConfig = {
            huggingface: {
                url: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
                headers: {}
            },
            cohere: {
                url: 'https://api.cohere.ai/v1/generate',
                headers: {}
            },
            groq: {
                url: 'https://api.groq.com/openai/v1/chat/completions',
                headers: {}
            },
            together: {
                url: 'https://api.together.xyz/inference',
                headers: {}
            }
        };
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupSpeechRecognition();
        this.setupVoices();
        this.setupEventListeners();
        this.updateStatus('Sistema iniciado', 'ready');
    }

    setupElements() {
        this.micButton = document.getElementById('micButton');
        this.textInput = document.getElementById('textInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.statusDot = this.statusIndicator.querySelector('.status-dot');
        
        // Settings
        this.settingsPanel = document.getElementById('settingsPanel');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.closeSettings = document.getElementById('closeSettings');
        this.aiProvider = document.getElementById('aiProvider');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speechRate = document.getElementById('speechRate');
        this.rateValue = document.getElementById('rateValue');
    }

    setupSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            this.updateStatus('Reconhecimento de voz não suportado', 'error');
            this.micButton.disabled = true;
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'pt-BR';
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.micButton.classList.add('listening');
            this.voiceStatus.textContent = 'Ouvindo...';
            this.updateStatus('Ouvindo', 'listening');
        };
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            if (transcript) {
                this.stopListening();
                this.processInput(transcript);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopListening();
            
            let errorMsg = 'Erro no reconhecimento';
            switch(event.error) {
                case 'no-speech':
                    errorMsg = 'Nenhuma fala detectada';
                    break;
                case 'not-allowed':
                    errorMsg = 'Permissão negada';
                    break;
                case 'network':
                    errorMsg = 'Erro de rede';
                    break;
            }
            
            this.updateStatus(errorMsg, 'error');
        };
        
        this.recognition.onend = () => {
            this.stopListening();
        };
    }

    setupVoices() {
        const loadVoices = () => {
            this.voices = speechSynthesis.getVoices();
            this.populateVoiceSelect();
        };
        
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        loadVoices();
        setTimeout(loadVoices, 1000);
    }

    populateVoiceSelect() {
        this.voiceSelect.innerHTML = '';
        
        if (this.voices.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Carregando vozes...';
            this.voiceSelect.appendChild(option);
            return;
        }

        // Priorizar vozes em português
        const portugueseVoices = this.voices.filter(voice => 
            voice.lang.includes('pt') || voice.lang.includes('PT')
        );
        
        const otherVoices = this.voices.filter(voice => 
            !voice.lang.includes('pt') && !voice.lang.includes('PT')
        );
        
        [...portugueseVoices, ...otherVoices].forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang})`;
            this.voiceSelect.appendChild(option);
        });
        
        // Auto-select primeira voz portuguesa
        if (portugueseVoices.length > 0) {
            this.voiceSelect.selectedIndex = 0;
        }
    }

    setupEventListeners() {
        // Microphone
        this.micButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        // Text input
        this.sendButton.addEventListener('click', () => {
            const text = this.textInput.value.trim();
            if (text) {
                this.processInput(text);
                this.textInput.value = '';
            }
        });

        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendButton.click();
            }
        });

        // Settings
        this.settingsToggle.addEventListener('click', () => {
            this.settingsPanel.classList.add('open');
        });

        this.closeSettings.addEventListener('click', () => {
            this.settingsPanel.classList.remove('open');
        });

        this.aiProvider.addEventListener('change', (e) => {
            this.currentProvider = e.target.value;
            this.updateStatus(`Provedor: ${e.target.options[e.target.selectedIndex].text}`, 'ready');
        });

        this.speechRate.addEventListener('input', (e) => {
            this.rateValue.textContent = `${e.target.value}x`;
        });

        // Close settings on outside click
        document.addEventListener('click', (e) => {
            if (!this.settingsPanel.contains(e.target) && !this.settingsToggle.contains(e.target)) {
                this.settingsPanel.classList.remove('open');
            }
        });
    }

    startListening() {
        if (!this.recognition || this.isProcessing) return;

        if (this.isSpeaking) {
            speechSynthesis.cancel();
            this.isSpeaking = false;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.updateStatus('Erro ao iniciar gravação', 'error');
        }
    }

    stopListening() {
        this.isListening = false;
        this.micButton.classList.remove('listening');
        this.voiceStatus.textContent = 'Clique para falar';
        this.updateStatus('Pronto', 'ready');
        
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    async processInput(text) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.addMessage(text, 'user');
        this.showTypingIndicator();
        this.updateStatus('Processando...', 'processing');
        
        try {
            const response = await this.getAIResponse(text);
            this.hideTypingIndicator();
            this.addMessage(response, 'bot');
            this.speak(response);
        } catch (error) {
            console.error('Error processing input:', error);
            this.hideTypingIndicator();
            const errorMsg = 'Desculpe, ocorreu um erro ao processar sua mensagem.';
            this.addMessage(errorMsg, 'bot');
            this.speak(errorMsg);
        } finally {
            this.isProcessing = false;
            this.updateStatus('Pronto', 'ready');
        }
    }

    async getAIResponse(text) {
        // Sistema prompt mínimo
        const systemContext = "Você trabalha para DeiviTech e está em um site de tecnologia. Responda de forma natural e conversacional.";
        const fullPrompt = `${systemContext}\n\nUsuário: ${text}\nAssistente:`;
        
        try {
            switch (this.currentProvider) {
                case 'huggingface':
                    return await this.callHuggingFaceAPI(fullPrompt);
                case 'cohere':
                    return await this.callCohereAPI(fullPrompt);
                case 'groq':
                    return await this.callGroqAPI(text, systemContext);
                case 'together':
                    return await this.callTogetherAPI(text, systemContext);
                default:
                    return await this.callHuggingFaceAPI(fullPrompt);
            }
        } catch (error) {
            console.error('API call failed:', error);
            // Fallback para resposta local simples
            return this.generateSimpleResponse(text);
        }
    }

    async callHuggingFaceAPI(prompt) {
        const response = await fetch(this.apiConfig.huggingface.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.apiConfig.huggingface.headers
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 150,
                    temperature: 0.7,
                    return_full_text: false
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HuggingFace API error: ${response.status}`);
        }

        const data = await response.json();
        if (data[0] && data[0].generated_text) {
            return data[0].generated_text.trim();
        }
        
        throw new Error('Invalid HuggingFace response');
    }

    async callCohereAPI(prompt) {
        // Cohere free tier might be limited, using fallback
        throw new Error('Cohere API not configured');
    }

    async callGroqAPI(text, systemContext) {
        // Groq might require API key, using fallback
        throw new Error('Groq API not configured');
    }

    async callTogetherAPI(text, systemContext) {
        // Together AI might require API key, using fallback
        throw new Error('Together API not configured');
    }

    generateSimpleResponse(text) {
        const lowerText = text.toLowerCase();
        
        // Respostas contextuais simples
        if (lowerText.includes('oi') || lowerText.includes('olá') || lowerText.includes('hello')) {
            return 'Olá! Como posso ajudar você hoje?';
        }
        
        if (lowerText.includes('obrigado') || lowerText.includes('valeu')) {
            return 'Por nada! Estou aqui para ajudar.';
        }
        
        if (lowerText.includes('react')) {
            return 'React é uma biblioteca JavaScript para construir interfaces de usuário. É mantida pelo Meta e muito popular no desenvolvimento web moderno.';
        }
        
        if (lowerText.includes('javascript')) {
            return 'JavaScript é a linguagem de programação da web. É versátil e pode ser usada tanto no frontend quanto no backend com Node.js.';
        }
        
        if (lowerText.includes('python')) {
            return 'Python é uma linguagem de programação de alto nível, conhecida por sua sintaxe limpa e legibilidade. É muito usada em ciência de dados e IA.';
        }
        
        if (lowerText.includes('ia') || lowerText.includes('inteligência artificial')) {
            return 'Inteligência Artificial é um campo fascinante que permite às máquinas simular aspectos da inteligência humana, como aprendizado e tomada de decisões.';
        }
        
        // Resposta genérica personalizada
        return `Interessante pergunta sobre "${text}". Como assistente do DeiviTech, posso ajudar com diversos tópicos de tecnologia. Pode me dar mais detalhes sobre o que você gostaria de saber?`;
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.textContent = text;
        
        messageDiv.appendChild(bubbleDiv);
        this.chatMessages.appendChild(messageDiv);
        
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot typing-message';
        messageDiv.id = 'typing-indicator';
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingDiv.appendChild(dot);
        }
        
        bubbleDiv.appendChild(typingDiv);
        messageDiv.appendChild(bubbleDiv);
        this.chatMessages.appendChild(messageDiv);
        
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    speak(text) {
        if (!('speechSynthesis' in window)) {
            this.updateStatus('Síntese de voz não suportada', 'error');
            return;
        }

        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        this.isSpeaking = true;
        this.updateStatus('Falando...', 'speaking');

        const utterance = new SpeechSynthesisUtterance(text);
        
        const selectedIndex = this.voiceSelect.selectedIndex;
        if (selectedIndex >= 0 && this.voices[selectedIndex]) {
            utterance.voice = this.voices[selectedIndex];
        }
        
        utterance.rate = parseFloat(this.speechRate.value);
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = 'pt-BR';

        utterance.onend = () => {
            this.isSpeaking = false;
            this.updateStatus('Pronto', 'ready');
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.isSpeaking = false;
            this.updateStatus('Erro na síntese de voz', 'error');
        };

        speechSynthesis.speak(utterance);
    }

    updateStatus(message, type = 'ready') {
        this.statusText.textContent = message;
        
        this.statusDot.classList.remove('active', 'error');
        
        if (type === 'listening' || type === 'processing' || type === 'speaking') {
            this.statusDot.classList.add('active');
        } else if (type === 'error') {
            this.statusDot.classList.add('error');
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DeiviTechAI();
});