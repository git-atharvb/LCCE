document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    const htmlElement = document.documentElement;

    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('dropzone');
    const fileIndicator = document.getElementById('file-indicator');
    const fileNameDisplay = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const textInput = document.getElementById('text-input');
    
    const analyzeBtns = document.querySelectorAll('.analyze-btn');
    const newAnalysisBtn = document.getElementById('new-analysis-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    
    const inputView = document.getElementById('input-view');
    const resultsView = document.getElementById('results-view');
    const originalTextContent = document.getElementById('original-text-content');
    
    // Chart instances
    let riskChartInstance = null;
    let radarChartInstance = null;
    const toast = document.getElementById('toast');
    
    // Result Containers
    const metadataContainer = document.getElementById('metadata-container');
    const risksContainer = document.getElementById('risks-container');
    const risksContent = document.getElementById('risks-content');
    const risksCount = document.getElementById('risks-count');
    const summaryContent = document.getElementById('summary-content');
    const obligationsList = document.getElementById('obligations-list');
    const obligationsCount = document.getElementById('obligations-count');
    const clausesContent = document.getElementById('clauses-content');

    let currentOriginalText = "";
    let currentResultsData = null; // Store results for PDF generation
    let selectedFile = null;

    // THEME TOGGLE LOGIC
    function toggleTheme() {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', newTheme);
        
        if (newTheme === 'dark') {
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }
    themeToggleBtn.addEventListener('click', toggleTheme);

    // TAB LOGIC
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
            checkInputValidity();
        });
    });

    // DRAG & DROP LOGIC
    dropzone.addEventListener('click', (e) => {
        if(e.target !== removeFileBtn && e.target.closest('#remove-file-btn') === null) {
            fileInput.click();
        }
    });
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent-primary)';
    });
    
    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        if (e.dataTransfer.files.length) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelection(e.target.files[0]);
        }
    });

    function handleFileSelection(file) {
        if (file.type !== 'application/pdf') {
            showToast("Only PDF files are supported for upload.");
            return;
        }
        selectedFile = file;
        fileNameDisplay.textContent = file.name;
        fileIndicator.classList.remove('hidden');
        dropzone.querySelector('h3').classList.add('hidden');
        dropzone.querySelector('p').classList.add('hidden');
        dropzone.querySelector('svg').classList.add('hidden');
        checkInputValidity();
    }

    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        fileInput.value = '';
        fileIndicator.classList.add('hidden');
        dropzone.querySelector('h3').classList.remove('hidden');
        dropzone.querySelector('p').classList.remove('hidden');
        dropzone.querySelector('svg').classList.remove('hidden');
        checkInputValidity();
    });

    textInput.addEventListener('input', checkInputValidity);

    function checkInputValidity() {
        const activeTab = document.querySelector('.tab.active').dataset.target;
        if (activeTab === 'upload-tab') {
            document.getElementById('analyze-btn-upload').disabled = !selectedFile;
        } else {
            document.getElementById('analyze-btn-paste').disabled = textInput.value.trim() === '';
        }
    }

    // NEW ANALYSIS LOGIC
    newAnalysisBtn.addEventListener('click', () => {
        resultsView.classList.remove('active');
        setTimeout(() => {
            resultsView.classList.add('hidden');
            inputView.classList.remove('hidden');
            inputView.classList.add('active');
        }, 300);
        
        selectedFile = null;
        fileInput.value = '';
        textInput.value = '';
        fileIndicator.classList.add('hidden');
        dropzone.querySelector('h3').classList.remove('hidden');
        dropzone.querySelector('p').classList.remove('hidden');
        dropzone.querySelector('svg').classList.remove('hidden');
        checkInputValidity();
    });

    // API REQUEST LOGIC
    const API_URL = 'http://127.0.0.1:5000/api/analyze';

    analyzeBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            setLoading(true);
            hideToast();
            
            const activeTab = document.querySelector('.tab.active').dataset.target;
            const formData = new FormData();
            
            if (activeTab === 'upload-tab' && selectedFile) {
                formData.append('file', selectedFile);
            } else {
                formData.append('text', textInput.value.trim());
            }

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to analyze document.');
                }

                const data = await response.json();
                currentOriginalText = data.original_text || textInput.value.trim();
                currentResultsData = data; // Cache for PDF download
                
                // Switch Views
                inputView.classList.remove('active');
                setTimeout(() => {
                    inputView.classList.add('hidden');
                    resultsView.classList.remove('hidden');
                    void resultsView.offsetWidth; 
                    resultsView.classList.add('active');
                    
                    originalTextContent.textContent = currentOriginalText;
                    populateResults(data);
                }, 300);
                
            } catch (error) {
                console.error('Error:', error);
                showToast(error.message || "An error occurred connecting to the server.");
            } finally {
                setLoading(false);
            }
        });
    });

    function setLoading(isLoading) {
        analyzeBtns.forEach(btn => {
            const btnText = btn.querySelector('.btn-text');
            const spinner = btn.querySelector('.spinner');
            if (isLoading) {
                btn.disabled = true;
                btnText.textContent = "Analyzing...";
                spinner.classList.remove('hidden');
            } else {
                checkInputValidity();
                btnText.textContent = btn.id === 'analyze-btn-upload' ? "Analyze PDF Document" : "Analyze Pasted Text";
                spinner.classList.add('hidden');
            }
        });
    }

    // PDF EXPORT LOGIC
    downloadPdfBtn.addEventListener('click', async () => {
        if (!currentResultsData) return;
        
        // Show loading state on button
        const originalText = downloadPdfBtn.innerHTML;
        downloadPdfBtn.innerHTML = '<div class="spinner"></div> Generating...';
        downloadPdfBtn.disabled = true;
        hideToast();

        try {
            const response = await fetch('http://127.0.0.1:5000/api/export-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentResultsData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate PDF.');
            }

            // Convert response to blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link to trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = "LCCE_Analysis_Report.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
        } catch (error) {
            console.error('Export Error:', error);
            showToast(error.message || "An error occurred while generating the PDF.");
        } finally {
            downloadPdfBtn.innerHTML = originalText;
            downloadPdfBtn.disabled = false;
        }
    });

    // HIGHLIGHTING LOGIC
    function highlightOriginalText(searchString) {
        if (!searchString) return;
        
        const escapedSearch = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 100);
        
        if (currentOriginalText.includes(searchString.substring(0, 50))) {
            const regex = new RegExp(`(${escapedSearch}[^<]*)`, 'i');
            const highlightedHtml = currentOriginalText.replace(regex, '<span class="highlight" id="scroll-target">$1</span>');
            originalTextContent.innerHTML = highlightedHtml;
            
            const target = document.getElementById('scroll-target');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => { originalTextContent.textContent = currentOriginalText; }, 3000);
            }
        }
    }

    // POPULATE UI
    function populateResults(data) {
        // 0. Build Dashboard Charts
        try {
            document.getElementById('dashboard-card').style.display = 'block';
            buildCharts(data);
        } catch (e) {
            console.error("Dashboard Error:", e);
        }

        // Metadata
        try {
            metadataContainer.innerHTML = '';
            if (data.metadata) {
                const icons = {'Parties': '👥', 'Dates': '📅', 'Monetary Values': '💵'};
                for (const [key, values] of Object.entries(data.metadata)) {
                    if (Array.isArray(values)) {
                        values.forEach(val => {
                            const chip = document.createElement('div');
                            chip.className = 'chip';
                            chip.innerHTML = `<span>${icons[key] || '📌'}</span><span class="chip-label">${key}</span><span class="chip-val">${val}</span>`;
                            metadataContainer.appendChild(chip);
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Metadata Error:", e);
        }

        // Risks
        try {
            risksContent.innerHTML = '';
            if (data.risks && Array.isArray(data.risks) && data.risks.length > 0) {
                risksContainer.classList.remove('hidden');
                risksCount.textContent = data.risks.length;
                data.risks.forEach(risk => {
                    const div = document.createElement('div');
                    div.className = 'risk-item';
                    div.innerHTML = `
                        <div class="risk-label">${escapeHtml(risk.risk_type)}</div>
                        <div class="risk-excerpt">"${escapeHtml(risk.excerpt)}"</div>
                        <div class="mitigation">
                            <strong>Mitigation Strategy</strong>
                            ${escapeHtml(risk.mitigation_strategy || "Review and negotiate this clause carefully.")}
                        </div>
                    `;
                    risksContent.appendChild(div);
                });
            } else {
                risksContainer.classList.add('hidden');
            }
        } catch (e) {
            console.error("Risks Error:", e);
        }

        // Summary
        summaryContent.textContent = data.summary || "No summary could be generated.";

        // Obligations
        try {
            obligationsList.innerHTML = '';
            if (data.obligations && Array.isArray(data.obligations) && data.obligations.length > 0) {
                obligationsCount.textContent = data.obligations.length;
                data.obligations.forEach(ob => {
                    const li = document.createElement('li');
                    li.textContent = ob;
                    li.addEventListener('click', () => highlightOriginalText(ob));
                    obligationsList.appendChild(li);
                });
            } else {
                obligationsCount.textContent = "0";
                const li = document.createElement('li');
                li.textContent = "No binding obligations detected.";
                li.style.pointerEvents = 'none';
                obligationsList.appendChild(li);
            }
        } catch (e) {
            console.error("Obligations Error:", e);
        }

        // Clauses
        try {
            clausesContent.innerHTML = '';
            if (data.clauses && typeof data.clauses === 'object' && !Array.isArray(data.clauses)) {
                for (const [type, content] of Object.entries(data.clauses)) {
                    if (content && content.trim() !== '') {
                        const clauseDiv = document.createElement('div');
                        clauseDiv.className = 'clause-item';
                        clauseDiv.innerHTML = `
                            <div class="clause-label">${escapeHtml(type)}</div>
                            <div class="clause-body">${escapeHtml(content)}</div>
                        `;
                        clauseDiv.querySelector('.clause-body').addEventListener('click', () => highlightOriginalText(content));
                        clausesContent.appendChild(clauseDiv);
                    }
                }
            }
        } catch (e) {
            console.error("Clauses Error:", e);
        }
    }

    function buildCharts(data) {
        const score = data.overall_risk_score || 0;
        document.getElementById('risk-score-display').textContent = score;
        
        let scoreColor = '#22c55e'; // Green
        if (score > 40) scoreColor = '#eab308'; // Yellow
        if (score > 70) scoreColor = '#ef4444'; // Red

        const riskCtx = document.getElementById('riskChart').getContext('2d');
        if (riskChartInstance) riskChartInstance.destroy();
        riskChartInstance = new Chart(riskCtx, {
            type: 'doughnut',
            data: {
                labels: ['Risk', 'Safe'],
                datasets: [{
                    data: [score, 100 - score],
                    backgroundColor: [scoreColor, 'rgba(148, 163, 184, 0.2)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                rotation: 270, // Start from top
                circumference: 180, // Half circle
            }
        });

        const fav = data.favorability || {};
        const radarCtx = document.getElementById('radarChart').getContext('2d');
        if (radarChartInstance) radarChartInstance.destroy();
        
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        radarChartInstance = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: ['Liability', 'IP Rights', 'Financials', 'Termination', 'Confidentiality'],
                datasets: [{
                    label: 'Favorability',
                    data: [
                        fav.liability || 5, 
                        fav.ip_rights || 5, 
                        fav.financials || 5, 
                        fav.termination || 5, 
                        fav.confidentiality || 5
                    ],
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderColor: '#2563eb',
                    pointBackgroundColor: '#2563eb',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: gridColor },
                        grid: { color: gridColor },
                        pointLabels: { color: textColor, font: { family: 'Inter', size: 11 } },
                        ticks: { display: false, min: 0, max: 10 }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return "";
        return unsafe
             .toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(hideToast, 4000);
    }
    function hideToast() { toast.classList.add('hidden'); }
});
