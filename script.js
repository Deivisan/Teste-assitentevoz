class DeiviTechAssistant {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.voices = [];
        this.currentProvider = 'local';
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupSpeechRecognition();
        this.setupVoices();
        this.setupEventListeners();
        this.addWelcomeMessage();
    }

    setupElements() {
        this.micButton = document.getElementById('micButton');
        this.textInput = document.getElementById('textInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.status = document.getElementById('status');
        this.aiProvider = document.getElementById('aiProvider');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speechRate = document.getElementById('speechRate');
        this.rateValue = document.getElementById('rateValue');
    }

    addWelcomeMessage() {
        this.addMessage('Olá! Eu sou o DeiviTech, seu assistente especializado em tecnologia. Como posso ajudar?', 'bot');
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'pt-BR';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.micButton.classList.add('recording');
                this.updateStatus('Ouvindo...', 'listening');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.trim();
                if (transcript) {
                    this.stopListening();
                    this.processUserInput(transcript);
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopListening();
                let errorMsg = 'Erro no reconhecimento de voz';
                
                switch(event.error) {
                    case 'no-speech':
                        errorMsg = 'Nenhuma fala detectada. Tente novamente.';
                        break;
                    case 'not-allowed':
                        errorMsg = 'Permissão negada para usar o microfone.';
                        break;
                    case 'network':
                        errorMsg = 'Erro de rede no reconhecimento de voz.';
                        break;
                }
                
                this.updateStatus(errorMsg);
            };
            
            this.recognition.onend = () => {
                this.stopListening();
            };
        } else {
            this.micButton.disabled = true;
            this.updateStatus('Reconhecimento de voz não suportado');
        }
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

        // Filtrar e priorizar vozes em português
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
        
        // Selecionar automaticamente uma voz portuguesa se disponível
        if (portugueseVoices.length > 0) {
            this.voiceSelect.selectedIndex = 0;
        }
    }

    setupEventListeners() {
        this.micButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        this.sendButton.addEventListener('click', () => {
            const text = this.textInput.value.trim();
            if (text) {
                this.processUserInput(text);
                this.textInput.value = '';
            }
        });

        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendButton.click();
            }
        });

        this.aiProvider.addEventListener('change', (e) => {
            this.currentProvider = e.target.value;
            console.log('Provider changed to:', this.currentProvider);
            this.updateStatus(`Provedor alterado para: ${e.target.options[e.target.selectedIndex].text}`);
        });

        this.speechRate.addEventListener('input', (e) => {
            this.rateValue.textContent = e.target.value;
        });

        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                this.processUserInput(text);
            });
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
            this.updateStatus('Erro ao iniciar reconhecimento');
        }
    }

    stopListening() {
        this.isListening = false;
        this.micButton.classList.remove('recording');
        this.updateStatus('Clique no microfone para falar');
        
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    async processUserInput(text) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.addMessage(text, 'user');
        this.updateStatus('Processando...', 'processing');
        
        try {
            const response = await this.getAIResponse(text);
            this.addMessage(response, 'bot');
            this.speak(response);
        } catch (error) {
            console.error('Error processing input:', error);
            const errorMsg = 'Desculpe, houve um erro ao processar sua mensagem.';
            this.addMessage(errorMsg, 'bot');
            this.speak(errorMsg);
        } finally {
            this.isProcessing = false;
        }
    }

    async getAIResponse(text) {
        console.log('Getting AI response for provider:', this.currentProvider);
        
        switch (this.currentProvider) {
            case 'openai':
                return await this.getOpenAIResponse(text);
            case 'gemini':
                return await this.getGeminiResponse(text);
            case 'claude':
                return await this.getClaudeResponse(text);
            case 'local':
            default:
                return this.getLocalResponse(text);
        }
    }

    async getOpenAIResponse(text) {
        try {
            // Simular resposta do OpenAI (você precisaria de uma API key real)
            await this.delay(1000); // Simular delay da API
            return `[OpenAI] Como DeiviTech, posso dizer que ${text.toLowerCase()} é um tópico interessante em tecnologia. O que você gostaria de saber especificamente?`;
        } catch (error) {
            console.log('OpenAI not available, falling back to local');
            return this.getLocalResponse(text);
        }
    }

    async getGeminiResponse(text) {
        try {
            // Simular resposta do Gemini
            await this.delay(1200);
            return `[Gemini] Sobre ${text.toLowerCase()}, posso explicar que na área de tecnologia isso é muito relevante. Quer que eu detalhe mais?`;
        } catch (error) {
            console.log('Gemini not available, falling back to local');
            return this.getLocalResponse(text);
        }
    }

    async getClaudeResponse(text) {
        try {
            // Simular resposta do Claude
            await this.delay(800);
            return `[Claude] Interessante pergunta sobre ${text.toLowerCase()}! Como especialista em tecnologia, posso ajudar você a entender melhor esse conceito.`;
        } catch (error) {
            console.log('Claude not available, falling back to local');
            return this.getLocalResponse(text);
        }
    }

    getLocalResponse(text) {
        const lowerText = text.toLowerCase();
        
        // Respostas específicas baseadas em palavras-chave
        if (lowerText.includes('react')) {
            return 'React é uma biblioteca JavaScript criada pelo Facebook para construir interfaces de usuário. É baseada em componentes e usa Virtual DOM para otimizar a performance.';
        }
        
        if (lowerText.includes('vue')) {
            return 'Vue.js é um framework JavaScript progressivo. É conhecido por sua facilidade de aprendizado e documentação excelente, sendo uma ótima alternativa ao React.';
        }
        
        if (lowerText.includes('javascript')) {
            return 'JavaScript é a linguagem de programação da web. Hoje em dia, é usada tanto no frontend quanto no backend com Node.js, e é uma das linguagens mais populares do mundo.';
        }
        
        if (lowerText.includes('python')) {
            return 'Python é uma linguagem de alto nível conhecida por sua sintaxe simples. É muito usada em ciência de dados, inteligência artificial, automação e desenvolvimento web.';
        }
        
        if (lowerText.includes('inteligência artificial') || lowerText.includes('ia')) {
            return 'Inteligência Artificial é a capacidade de máquinas simularem a inteligência humana. Inclui machine learning, deep learning, processamento de linguagem natural e visão computacional.';
        }
        
        if (lowerText.includes('machine learning')) {
            return 'Machine Learning é um subcampo da IA onde sistemas aprendem padrões nos dados sem programação explícita. Existem três tipos: supervisionado, não supervisionado e por reforço.';
        }
        
        if (lowerText.includes('cloud')) {
            return 'Cloud Computing permite acessar recursos computacionais via internet. Os principais provedores são AWS, Microsoft Azure e Google Cloud Platform.';
        }
        
        if (lowerText.includes('linguagem')) {
            return 'As linguagens de programação mais populares atualmente são JavaScript, Python, Java, TypeScript, C#, Go e Rust. Para iniciantes, recomendo Python ou JavaScript.';
        }
        
        if (lowerText.includes('como') && lowerText.includes('programar')) {
            return 'Para começar a programar: 1) Escolha uma linguagem (Python para iniciantes), 2) Pratique em plataformas como Codecademy, 3) Faça projetos pequenos, 4) Use GitHub, 5) Seja consistente!';
        }
        
        // Resposta padrão variada
        const defaultResponses = [
            `Interessante pergunta sobre "${text}"! Como DeiviTech, posso ajudar com diversos tópicos de tecnologia. Pode ser mais específico?`,
            `Sobre "${text}", é um tópico fascinante na tecnologia atual. O que exatamente você gostaria de saber?`,
            `"${text}" é uma área importante da tecnologia. Posso explicar conceitos específicos ou tirar dúvidas técnicas sobre isso.`
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = text;
        
        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    speak(text) {
        if (!('speechSynthesis' in window)) {
            this.updateStatus('Síntese de voz não suportada');
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
            this.updateStatus('Conversa terminada. Clique no microfone para continuar.');
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.isSpeaking = false;
            this.updateStatus('Erro na síntese de voz');
        };

        speechSynthesis.speak(utterance);
    }

    updateStatus(message, className = '') {
        this.status.textContent = message;
        this.status.className = `status ${className}`;
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new DeiviTechAssistant();
});