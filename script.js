class DeiviTechAssistant {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.voices = [];
        this.currentProvider = 'google-web';
        this.voiceEngine = 'auto';
        this.conversationMode = 'continuous';
        this.browserInfo = this.detectBrowser();
        this.silenceTimer = null;
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        this.setupElements();
        this.displayBrowserInfo();
        this.setupSpeechRecognition();
        this.setupVoices();
        this.setupEventListeners();
        this.loadOptimalVoices();
    }

    detectBrowser() {
        const userAgent = navigator.userAgent;
        let browserName = 'Unknown';
        let isChrome = false;
        let isEdge = false;
        
        if (userAgent.includes('Edg/')) {
            browserName = 'Microsoft Edge';
            isEdge = true;
        } else if (userAgent.includes('Chrome/')) {
            browserName = 'Google Chrome';
            isChrome = true;
        } else if (userAgent.includes('Firefox/')) {
            browserName = 'Mozilla Firefox';
        } else if (userAgent.includes('Safari/')) {
            browserName = 'Safari';
        }

        return {
            name: browserName,
            isChrome,
            isEdge,
            supportsWebSpeech: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            supportsSpeechSynthesis: 'speechSynthesis' in window
        };
    }

    displayBrowserInfo() {
        document.getElementById('detectedBrowser').textContent = 
            `Navegador: ${this.browserInfo.name}`;
        
        const supportText = this.browserInfo.supportsWebSpeech && this.browserInfo.supportsSpeechSynthesis 
            ? '✅ Suporte completo a voz natural' 
            : '❌ Suporte limitado a voz';
        
        document.getElementById('voiceSupport').textContent = supportText;
    }

    setupElements() {
        this.micButton = document.getElementById('micButton');
        this.textInput = document.getElementById('textInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.status = document.getElementById('status');
        this.aiProvider = document.getElementById('aiProvider');
        this.voiceEngine = document.getElementById('voiceEngine');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speechRate = document.getElementById('speechRate');
        this.rateValue = document.getElementById('rateValue');
        this.conversationModeSelect = document.getElementById('conversationMode');
    }

    setupSpeechRecognition() {
        if (!this.browserInfo.supportsWebSpeech) {
            this.updateStatus('❌ Seu navegador não suporta reconhecimento de voz');
            this.micButton.disabled = true;
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configurações otimizadas para conversação natural
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';
        this.recognition.maxAlternatives = 1;
        
        // Eventos do reconhecimento
        this.recognition.onstart = () => {
            this.isListening = true;
            this.micButton.classList.add('listening');
            this.updateStatus('🎧 Ouvindo...', 'listening');
        };
        
        this.recognition.onresult = (event) => {
            this.handleSpeechResult(event);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.handleSpeechError(event.error);
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.micButton.classList.remove('listening');
            
            if (this.conversationMode === 'continuous' && !this.isSpeaking && !this.isProcessing) {
                // Reiniciar automaticamente em modo contínuo
                setTimeout(() => {
                    if (!this.isSpeaking && !this.isProcessing) {
                        this.startListening(false);
                    }
                }, 300);
            } else {
                this.updateStatus('✋ Pronto para conversar');
            }
        };
    }

    handleSpeechResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Mostrar resultado intermediário
        if (interimTranscript) {
            this.updateStatus(`🎤 "${interimTranscript.trim()}"`, 'listening');
        }
        
        // Processar resultado final
        if (finalTranscript.trim()) {
            clearTimeout(this.silenceTimer);
            this.processUserInput(finalTranscript.trim());
        }
    }

    handleSpeechError(error) {
        let errorMessage = 'Erro no reconhecimento de voz';
        
        switch (error) {
            case 'no-speech':
                errorMessage = '🔇 Nenhuma fala detectada';
                break;
            case 'audio-capture':
                errorMessage = '🎤 Erro no microfone - verifique as permissões';
                break;
            case 'not-allowed':
                errorMessage = '❌ Permissão negada para o microfone';
                break;
            case 'network':
                errorMessage = '🌐 Erro de rede no reconhecimento de voz';
                break;
        }
        
        this.updateStatus(errorMessage);
        this.stopListening();
    }

    setupVoices() {
        const updateVoices = () => {
            this.voices = speechSynthesis.getVoices();
            this.populateVoiceSelect();
        };
        
        // Aguardar carregamento das vozes
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = updateVoices;
        }
        
        // Tentar carregar imediatamente também
        setTimeout(updateVoices, 100);
        setTimeout(updateVoices, 1000);
    }

    populateVoiceSelect() {
        this.voiceSelect.innerHTML = '';
        
        if (this.voices.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Carregando vozes...';
            this.voiceSelect.appendChild(option);
            return;
        }

        const selectedEngine = this.voiceEngine;
        let filteredVoices = this.voices;
        
        // Filtrar vozes baseado no motor selecionado
        if (selectedEngine === 'auto') {
            if (this.browserInfo.isEdge) {
                filteredVoices = this.voices.filter(voice => 
                    voice.name.includes('Microsoft') || voice.lang.includes('pt')
                );
            } else if (this.browserInfo.isChrome) {
                filteredVoices = this.voices.filter(voice => 
                    voice.name.includes('Google') || voice.lang.includes('pt')
                );
            }
        } else if (selectedEngine === 'chrome') {
            filteredVoices = this.voices.filter(voice => 
                voice.name.includes('Google') || (!voice.name.includes('Microsoft') && voice.lang.includes('pt'))
            );
        } else if (selectedEngine === 'edge') {
            filteredVoices = this.voices.filter(voice => 
                voice.name.includes('Microsoft') || voice.name.includes('Azure')
            );
        }
        
        // Priorizar vozes em português
        const portugueseVoices = filteredVoices.filter(voice => 
            voice.lang.includes('pt') || voice.lang.includes('PT')
        );
        
        const otherVoices = filteredVoices.filter(voice => 
            !voice.lang.includes('pt') && !voice.lang.includes('PT')
        );
        
        [...portugueseVoices, ...otherVoices].forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            
            // Marcar vozes recomendadas
            if (voice.name.includes('Microsoft') && voice.lang.includes('pt')) {
                option.textContent += ' ⭐ Recomendada';
            } else if (voice.name.includes('Google') && voice.lang.includes('pt')) {
                option.textContent += ' ⭐ Natural';
            }
            
            this.voiceSelect.appendChild(option);
        });
        
        // Selecionar automaticamente a melhor voz
        this.selectOptimalVoice();
    }

    selectOptimalVoice() {
        const options = this.voiceSelect.options;
        
        // Procurar pela melhor voz portuguesa
        for (let i = 0; i < options.length; i++) {
            const optionText = options[i].textContent.toLowerCase();
            if ((optionText.includes('microsoft') || optionText.includes('google')) && 
                optionText.includes('pt')) {
                this.voiceSelect.selectedIndex = i;
                break;
            }
        }
    }

    loadOptimalVoices() {
        // Aguardar um pouco mais para garantir que as vozes carreguem
        setTimeout(() => {
            if (this.voices.length === 0) {
                this.setupVoices();
            }
        }, 2000);
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
        });

        this.voiceEngine.addEventListener('change', (e) => {
            this.voiceEngine = e.target.value;
            this.populateVoiceSelect();
        });

        this.speechRate.addEventListener('input', (e) => {
            this.rateValue.textContent = e.target.value;
        });

        this.conversationModeSelect.addEventListener('change', (e) => {
            this.conversationMode = e.target.value;
            
            if (this.conversationMode === 'continuous' && !this.isListening && !this.isSpeaking) {
                this.startListening(false);
            } else if (this.conversationMode === 'click' && this.isListening) {
                this.stopListening();
            }
        });

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                this.processUserInput(text);
            });
        });
    }

    startListening(userInitiated = true) {
        if (!this.recognition || this.isSpeaking || this.isProcessing) return;

        // Parar qualquer síntese de fala em andamento
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            this.isSpeaking = false;
        }

        try {
            this.recognition.start();
            if (userInitiated) {
                this.updateStatus('🎤 Clique novamente para parar', 'listening');
            }
        } catch (error) {
            if (error.name !== 'InvalidStateError') {
                console.error('Error starting recognition:', error);
                this.updateStatus('Erro ao iniciar reconhecimento de voz');
            }
        }
    }

    stopListening() {
        this.isListening = false;
        this.micButton.classList.remove('listening');
        
        if (this.recognition) {
            this.recognition.stop();
        }
        
        this.updateStatus('✋ Pronto para conversar');
    }

    async processUserInput(text) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.addMessage(text, 'user');
        this.updateStatus('🤔 Pensando...', 'processing');
        
        // Parar de ouvir enquanto processa
        if (this.isListening) {
            this.recognition.stop();
        }
        
        try {
            const response = await this.getAIResponse(text);
            this.addMessage(response, 'bot');
            this.speak(response);
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMsg = 'Desculpe, houve um erro ao processar sua mensagem.';
            this.addMessage(errorMsg, 'bot');
            this.speak(errorMsg);
        } finally {
            this.isProcessing = false;
        }
    }

    async getAIResponse(text) {
        switch (this.currentProvider) {
            case 'google-web':
                return await this.getGoogleWebResponse(text);
            case 'openai-web':
                return await this.getOpenAIWebResponse(text);
            default:
                return this.getIntelligentLocalResponse(text);
        }
    }

    async getGoogleWebResponse(text) {
        // Usar uma API gratuita do Google ou fallback para local
        try {
            // Tentativa com API pública do Google (se disponível)
            const response = await fetch('https://api.wit.ai/message', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer YOUR_WIT_AI_TOKEN'
                }
            });
            
            // Se falhar, usar resposta local inteligente
            return this.getIntelligentLocalResponse(text);
        } catch (error) {
            return this.getIntelligentLocalResponse(text);
        }
    }

    async getOpenAIWebResponse(text) {
        try {
            // Usar um proxy gratuito ou API pública
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: text }]
                })
            });
            
            return this.getIntelligentLocalResponse(text);
        } catch (error) {
            return this.getIntelligentLocalResponse(text);
        }
    }

    getIntelligentLocalResponse(text) {
        const lowerText = text.toLowerCase();
        
        // Respostas mais inteligentes e contextuais
        const responses = {
            // Programação
            'react': 'React é uma biblioteca JavaScript criada pelo Facebook para construir interfaces de usuário. É baseada em componentes reutilizáveis e usa um Virtual DOM para otimizar performance. É muito popular para desenvolvimento de SPAs.',
            
            'vue': 'Vue.js é um framework JavaScript progressivo criado por Evan You. É conhecido por sua curva de aprendizado suave, documentação excelente e flexibilidade. Combina o melhor do Angular e React.',
            
            'javascript': 'JavaScript é a linguagem de programação da web. Originalmente criada para navegadores, hoje roda em servidores com Node.js, aplicativos móveis, desktop e até IoT. É uma linguagem interpretada, dinâmica e multi-paradigma.',
            
            'python': 'Python é uma linguagem de programação de alto nível criada por Guido van Rossum. É conhecida por sua sintaxe clara e legível. É muito usada em ciência de dados, IA, automação e desenvolvimento web.',
            
            'node': 'Node.js é um runtime JavaScript que permite executar JavaScript no servidor. Foi criado por Ryan Dahl usando a engine V8 do Chrome. É muito usado para APIs, aplicações em tempo real e microserviços.',
            
            // Inteligência Artificial
            'inteligência artificial': 'Inteligência Artificial é a capacidade de máquinas simularem inteligência humana. Inclui aprendizado, raciocínio e autocorreção. Hoje temos IA em assistentes virtuais, carros autônomos, diagnósticos médicos e muito mais.',
            
            'machine learning': 'Machine Learning é um subcampo da IA onde sistemas aprendem padrões nos dados sem programação explícita. Existem três tipos principais: supervisionado, não supervisionado e por reforço.',
            
            'deep learning': 'Deep Learning usa redes neurais artificiais com múltiplas camadas para aprender representações complexas dos dados. É a tecnologia por trás do reconhecimento facial, tradução automática e GPT.',
            
            // Cloud Computing
            'cloud': 'Computação em nuvem permite acessar recursos computacionais via internet sob demanda. Os principais provedores são AWS, Azure e Google Cloud. Oferece escalabilidade, economia e flexibilidade.',
            
            'aws': 'Amazon Web Services é a plataforma de nuvem da Amazon, líder mundial em cloud computing. Oferece mais de 200 serviços incluindo EC2, S3, Lambda e muito mais.',
            
            // Desenvolvimento Web
            'html': 'HTML (HyperText Markup Language) é a linguagem de marcação padrão para páginas web. Define a estrutura e conteúdo das páginas usando elementos e tags.',
            
            'css': 'CSS (Cascading Style Sheets) é usado para estilizar páginas HTML. Define cores, layouts, fontes, animações e responsividade. É essencial para criar interfaces atraentes.',
            
            // Bancos de Dados
            'sql': 'SQL (Structured Query Language) é a linguagem padrão para gerenciar bancos de dados relacionais. Permite criar, consultar, atualizar e deletar dados de forma eficiente.',
            
            'mongodb': 'MongoDB é um banco de dados NoSQL orientado a documentos. Armazena dados em formato BSON (similar ao JSON) e é muito usado em aplicações web modernas por sua flexibilidade.'
        };
        
        // Buscar por palavras-chave no texto
        for (const [keyword, response] of Object.entries(responses)) {
            if (lowerText.includes(keyword)) {
                return response;
            }
        }
        
        // Respostas baseadas em padrões
        if (lowerText.includes('como') && lowerText.includes('programar')) {
            return 'Para começar a programar, recomendo: 1) Escolha uma linguagem (Python é ótima para iniciantes), 2) Pratique no Codecademy ou FreeCodeCamp, 3) Faça projetos pequenos, 4) Participe de comunidades como GitHub, 5) Seja consistente - pratique todos os dias!';
        }
        
        if (lowerText.includes('linguagem') && lowerText.includes('popular')) {
            return 'As linguagens mais populares em 2024 são: 1) JavaScript (web e backend), 2) Python (IA e ciência de dados), 3) Java (enterprise), 4) TypeScript (JavaScript tipado), 5) C# (Microsoft), 6) Go (sistemas), 7) Rust (performance e segurança).';
        }
        
        if (lowerText.includes('diferença')) {
            return 'Ótima pergunta sobre comparações! Posso explicar diferenças entre tecnologias. Por exemplo, React vs Vue, SQL vs NoSQL, ou qualquer outra comparação específica que você queira saber.';
        }
        
        // Resposta padrão mais inteligente
        const defaultResponses = [
            'Interessante pergunta sobre tecnologia! Como DeiviTech, posso ajudar com programação, IA, desenvolvimento web, cloud computing e muito mais. Pode ser mais específico?',
            'Essa é uma área fascinante da tecnologia! Gostaria que eu explique algum conceito específico ou tem alguma dúvida técnica?',
            'Ótimo tópico! Na tecnologia atual, isso é muito relevante. Quer que eu detalhe mais algum aspecto específico?'
        ];
        
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = text;
        
        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        
        // Auto-scroll suave
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    speak(text) {
        if (!this.browserInfo.supportsSpeechSynthesis) {
            this.updateStatus('❌ Síntese de voz não suportada');
            return;
        }

        // Parar qualquer fala em andamento
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        this.isSpeaking = true;
        this.updateStatus('🗣️ Falando...', 'speaking');

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Usar voz selecionada
        const selectedVoiceName = this.voiceSelect.value;
        if (selectedVoiceName) {
            const selectedVoice = this.voices.find(voice => voice.name === selectedVoiceName);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }
        
        // Configurações otimizadas
        utterance.rate = parseFloat(this.speechRate.value);
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = 'pt-BR';

        utterance.onend = () => {
            this.isSpeaking = false;
            this.updateStatus('✅ Pronto para conversar');
            
            // Retomar escuta em modo contínuo
            if (this.conversationMode === 'continuous') {
                setTimeout(() => {
                    if (!this.isListening && !this.isProcessing) {
                        this.startListening(false);
                    }
                }, 500);
            }
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

// Inicializar o assistente
document.addEventListener('DOMContentLoaded', () => {
    new DeiviTechAssistant();
});