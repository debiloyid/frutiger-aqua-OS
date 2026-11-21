document.addEventListener('DOMContentLoaded', () => {
    let highestZ = 20;
    let audioCtx = null;

    function playSystemBeep(freq = 540, duration = 0.07) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {}
    }

    // 1. Годинник (трей + аналоговий гаджет Vista)
    function updateClock() {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const s = now.getSeconds();

        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

        document.getElementById('tray-clock').textContent = timeStr;
        document.getElementById('tray-date').textContent = dateStr;
        document.getElementById('widget-time').textContent = timeStr;

        const hourDeg = ((h % 12) + m / 60) * 30;
        const minDeg = (m + s / 60) * 6;
        const secDeg = s * 6;

        document.getElementById('hour-hand').style.transform = `rotate(${hourDeg}deg)`;
        document.getElementById('min-hand').style.transform = `rotate(${minDeg}deg)`;
        document.getElementById('sec-hand').style.transform = `rotate(${secDeg}deg)`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // 2. Управління вікнами
    const windows = document.querySelectorAll('.win-window');
    const taskList = document.getElementById('task-list');
    const startMenu = document.getElementById('start-menu');
    const ctxMenu = document.getElementById('context-menu');

    function bringToFront(win) {
        highestZ++;
        win.style.zIndex = highestZ;
        updateTaskbar();
    }

    function openWindow(id) {
        const win = document.getElementById(id);
        if (!win) return;
        win.style.display = 'flex';
        bringToFront(win);
        startMenu.classList.remove('open');
        ctxMenu.classList.remove('open');
        playSystemBeep(620, 0.06);
    }

    function closeWindow(id) {
        const win = document.getElementById(id);
        if (win) {
            win.style.display = 'none';
            updateTaskbar();
            playSystemBeep(360, 0.06);
        }
    }

    function updateTaskbar() {
        taskList.innerHTML = '';
        windows.forEach(win => {
            if (win.style.display !== 'none') {
                const tab = document.createElement('div');
                tab.className = 'task-tab';
                if (parseInt(win.style.zIndex) === highestZ) tab.classList.add('active');
                tab.textContent = win.querySelector('.win-title-text').textContent.trim();
                tab.addEventListener('click', () => bringToFront(win));
                taskList.appendChild(tab);
            }
        });
    }

    windows.forEach(win => {
        win.addEventListener('mousedown', () => bringToFront(win));
        const titleBar = win.querySelector('.win-titlebar');
        let isDragging = false, offsetX = 0, offsetY = 0;

        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || win.dataset.maximized === 'true') return;
            isDragging = true;
            offsetX = e.clientX - win.offsetLeft;
            offsetY = e.clientY - win.offsetTop;
            bringToFront(win);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newX = e.clientX - offsetX;
            const newY = Math.max(0, Math.min(window.innerHeight - 66, e.clientY - offsetY));
            win.style.left = newX + 'px';
            win.style.top = newY + 'px';
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
    });

    document.querySelectorAll('.cap-close').forEach(btn => {
        btn.addEventListener('click', () => closeWindow(btn.dataset.close));
    });

    document.querySelectorAll('.cap-min').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.win-window').style.display = 'none';
            updateTaskbar();
        });
    });

    document.querySelectorAll('.cap-max').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const win = e.target.closest('.win-window');
            if (win.dataset.maximized === 'true') {
                win.style.top = win.dataset.prevTop;
                win.style.left = win.dataset.prevLeft;
                win.style.width = win.dataset.prevWidth;
                win.style.height = win.dataset.prevHeight;
                win.dataset.maximized = 'false';
            } else {
                win.dataset.prevTop = win.style.top;
                win.dataset.prevLeft = win.style.left;
                win.dataset.prevWidth = win.style.width;
                win.dataset.prevHeight = win.style.height || 'auto';
                win.style.top = '0px';
                win.style.left = '0px';
                win.style.width = '100vw';
                win.style.height = 'calc(100vh - 36px)';
                win.dataset.maximized = 'true';
            }
        });
    });

    document.querySelectorAll('[data-win]').forEach(el => {
        el.addEventListener('click', () => openWindow(el.dataset.win));
    });

    updateTaskbar();
    // 3. Провідник Windows Vista
    const expView = document.getElementById('exp-main-view');
    const expPath = document.getElementById('exp-path');
    const expBackBtn = document.getElementById('exp-back');
    let folderHistory = ['root'];

    const foldersData = {
        root: {
            title: 'Комп\'ютер',
            html: `
                <div class="exp-section">Жорсткі диски (2)</div>
                <div class="exp-items-grid">
                    <div class="exp-item-card" data-open-folder="drive_c">
                        <div class="hdd-box"></div>
                        <div>
                            <div><strong>Локальний диск (C:)</strong></div>
                            <div class="drive-meter"><div style="width:62%"></div></div>
                            <small>45,6 ГБ вільно з 120 ГБ</small>
                        </div>
                    </div>
                    <div class="exp-item-card" data-open-folder="docs">
                        <div class="hdd-box"></div>
                        <div>
                            <div><strong>Aqua Data (D:)</strong></div>
                            <div class="drive-meter"><div style="width:28%"></div></div>
                            <small>180 ГБ вільно з 250 ГБ</small>
                        </div>
                    </div>
                </div>
            `
        },
        drive_c: {
            title: 'Комп\'ютер > Локальний диск (C:)',
            html: `
                <div class="exp-section">Системні папки</div>
                <div class="exp-items-grid">
                    <div class="exp-item-card" data-open-folder="docs"><div class="folder-box"></div><div><strong>Users</strong><br><small>Файли користувача</small></div></div>
                    <div class="exp-item-card" data-open-folder="pics"><div class="folder-box"></div><div><strong>Windows</strong><br><small>Компоненти Vista</small></div></div>
                    <div class="exp-item-card" data-open-folder="music"><div class="folder-box"></div><div><strong>Program Files</strong><br><small>Програми та ігри</small></div></div>
                </div>
            `
        },
        docs: {
            title: 'Комп\'ютер > Документи',
            html: `
                <div class="exp-section">Документи</div>
                <div class="exp-items-grid">
                    <div class="exp-item-card" data-open-app="win-notes"><div class="file-box"></div><div><strong>Нотатки.txt</strong><br><small>Блокнот</small></div></div>
                    <div class="exp-item-card" data-open-app="win-ie"><div class="file-box"></div><div><strong>Aqua_Portal.url</strong><br><small>Internet Explorer</small></div></div>
                </div>
            `
        },
        pics: {
            title: 'Комп\'ютер > Зображення',
            html: `
                <div class="exp-section">Графіка</div>
                <div class="exp-items-grid">
                    <div class="exp-item-card" data-open-app="win-aquarium"><div class="file-box"></div><div><strong>Reef_Live.scr</strong><br><small>Акваріум 3D</small></div></div>
                    <div class="exp-item-card" data-open-app="win-paint"><div class="file-box"></div><div><strong>Dolphin_Art.bmp</strong><br><small>Paint</small></div></div>
                </div>
            `
        },
        music: {
            title: 'Комп\'ютер > Музика',
            html: `
                <div class="exp-section">Музика</div>
                <div class="exp-items-grid">
                    <div class="exp-item-card" data-open-app="win-media"><div class="file-box"></div><div><strong>Underwater_Dream.mp3</strong><br><small>Media Player</small></div></div>
                </div>
            `
        }
    };

    function renderFolder(key, pushHistory = true) {
        const data = foldersData[key] || foldersData.root;
        if (pushHistory && folderHistory[folderHistory.length - 1] !== key) folderHistory.push(key);
        expPath.textContent = data.title;
        expView.innerHTML = data.html;
        expBackBtn.disabled = folderHistory.length <= 1;

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.folder === key);
        });
        expView.querySelectorAll('[data-open-folder]').forEach(card => {
            card.addEventListener('click', () => renderFolder(card.dataset.openFolder, true));
        });
        expView.querySelectorAll('[data-open-app]').forEach(card => {
            card.addEventListener('click', () => openWindow(card.dataset.openApp));
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => renderFolder(link.dataset.folder, true));
    });
    expBackBtn.addEventListener('click', () => {
        if (folderHistory.length > 1) {
            folderHistory.pop();
            renderFolder(folderHistory[folderHistory.length - 1], false);
        }
    });
    renderFolder('root', false);

    // 4. Кошик-басейн з каченям
    const binList = document.getElementById('deleted-files-list');
    const binStatus = document.getElementById('bin-status');

    document.getElementById('btn-empty-bin').addEventListener('click', () => {
        binList.innerHTML = '';
        binStatus.textContent = 'Об\'єктів: 0 (0 байт)';
        playSystemBeep(420, 0.08);
    });

    document.getElementById('btn-restore-bin').addEventListener('click', () => {
        binList.innerHTML = '<div class="bin-file">Old_Vista_Theme.bak</div><div class="bin-file">Coral_Reef_Draft.png</div>';
        binStatus.textContent = 'Об\'єктів: 2 (14,2 МБ)';
        playSystemBeep(660, 0.08);
    });

    // 5. Підводні теми
    const themes = ['theme-aqua', 'theme-abyss', 'theme-coral', 'theme-aurora'];
    let currentThemeIdx = 0;

    function applyTheme(themeName) {
        document.body.className = themeName;
        currentThemeIdx = themes.indexOf(themeName);
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === themeName);
        });
        playSystemBeep(720, 0.07);
    }

    function nextTheme() {
        currentThemeIdx = (currentThemeIdx + 1) % themes.length;
        applyTheme(themes[currentThemeIdx]);
    }

    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.addEventListener('click', () => applyTheme(opt.dataset.theme));
    });
    document.getElementById('toggle-widgets').addEventListener('change', (e) => {
        document.getElementById('widgets-area').classList.toggle('hidden', !e.target.checked);
    });
    document.getElementById('toggle-globe').addEventListener('change', (e) => {
        document.getElementById('bg-globe').classList.toggle('hidden', !e.target.checked);
    });
    // 6. Контекстне меню та Меню Пуск Vista
    document.getElementById('desktop').addEventListener('contextmenu', (e) => {
        if (e.target.closest('.win-window') || e.target.closest('#taskbar') || e.target.closest('#start-menu')) return;
        e.preventDefault();
        ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
        ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 190) + 'px';
        ctxMenu.classList.add('open');
        startMenu.classList.remove('open');
    });

    document.getElementById('ctx-refresh').addEventListener('click', () => {
        ctxMenu.classList.remove('open');
        const grid = document.getElementById('desktop-grid');
        grid.style.opacity = '0.25';
        setTimeout(() => { grid.style.opacity = '1'; }, 140);
    });

    document.getElementById('ctx-next-theme').addEventListener('click', () => {
        ctxMenu.classList.remove('open');
        nextTheme();
    });

    const startBtn = document.getElementById('start-btn');
    const searchInput = document.getElementById('start-search');

    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu.classList.toggle('open');
        ctxMenu.classList.remove('open');
        if (startMenu.classList.contains('open')) {
            searchInput.value = '';
            filterStartItems('');
            searchInput.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) startMenu.classList.remove('open');
        if (!ctxMenu.contains(e.target)) ctxMenu.classList.remove('open');
    });

    document.querySelectorAll('.vsm-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.vsm-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.vsm-apps').forEach(list => list.classList.add('hidden'));
            document.getElementById(tab.dataset.stab).classList.remove('hidden');
            searchInput.value = '';
            filterStartItems('');
        });
    });

    function filterStartItems(query) {
        const q = query.toLowerCase().trim();
        const lists = document.querySelectorAll('.vsm-apps');
        if (q) {
            lists.forEach(l => l.classList.remove('hidden'));
            document.querySelectorAll('.vsm-item').forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
            });
        } else {
            const activeTab = document.querySelector('.vsm-tab.active').dataset.stab;
            lists.forEach(l => l.classList.toggle('hidden', l.id !== activeTab));
            document.querySelectorAll('.vsm-item').forEach(item => { item.style.display = 'flex'; });
        }
    }

    searchInput.addEventListener('input', (e) => filterStartItems(e.target.value));
    document.getElementById('quick-theme-btn').addEventListener('click', nextTheme);
    document.getElementById('tray-theme-btn').addEventListener('click', nextTheme);

    function minimizeAll() {
        windows.forEach(w => { w.style.display = 'none'; });
        updateTaskbar();
        startMenu.classList.remove('open');
    }
    document.getElementById('close-all-btn').addEventListener('click', minimizeAll);
    document.getElementById('show-desktop-sliver').addEventListener('click', minimizeAll);

    const lockScreen = document.getElementById('lock-screen');
    document.getElementById('btn-lock').addEventListener('click', () => {
        startMenu.classList.remove('open');
        lockScreen.classList.remove('hidden');
    });
    document.getElementById('btn-unlock').addEventListener('click', () => lockScreen.classList.add('hidden'));
    document.getElementById('btn-shutdown').addEventListener('click', () => {
        document.body.innerHTML = '<div style="background:#003366;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center;font-size:20px;">Завершення роботи Windows Vista...</div>';
        setTimeout(() => location.reload(), 1500);
    });

    // 7. Internet Explorer 7
    const ieViewport = document.getElementById('ie-viewport');
    const ieUrl = document.getElementById('ie-url');
    const ieSites = {
        portal: {
            url: 'http://frutiger-aqua.net',
            html: `<div class="ie-hero"><h3>Ласкаво просимо на Aqua Portal 2007</h3><p>Ваш провідник у кришталево чистий світ технологій та океану.</p></div>
                   <div class="ie-card-row">
                     <div class="ie-mini-card"><strong>Погода в Лагуні</strong><br>Температура води +24°C, видимість 100%.</div>
                     <div class="ie-mini-card"><strong>Порада дня</strong><br>Використовуйте прозорі вікна Windows Aero для комфортної роботи.</div>
                   </div>`
        },
        ocean: {
            url: 'http://ocean-life.org',
            html: `<div class="ie-hero"><h3>Мешканці глибокого рифу</h3><p>Медузи та золоті рибки — головні символи естетики Frutiger Aqua.</p></div>
                   <p>Медузи рухаються завдяки ритмічному скороченню напівпрозорого купола, переливаючись у променях сонця крізь товщу води.</p>`
        },
        downloads: {
            url: 'http://vista-extras.com',
            html: `<div class="ie-hero"><h3>Центр завантажень Windows Vista</h3><p>Офіційні доповнення для робочого столу.</p></div>
                   <div class="ie-mini-card"><strong>Aero Aquarium Screensaver v2.0</strong> — вже встановлено у вашій системі!</div>`
        }
    };

    function loadIeTab(key) {
        const site = ieSites[key] || ieSites.portal;
        ieUrl.value = site.url;
        ieViewport.innerHTML = site.html;
        document.querySelectorAll('.ie-tab').forEach(t => t.classList.toggle('active', t.dataset.site === key));
    }
    document.querySelectorAll('.ie-tab').forEach(t => t.addEventListener('click', () => loadIeTab(t.dataset.site)));
    document.getElementById('ie-refresh').addEventListener('click', () => {
        ieViewport.style.opacity = '0.3';
        setTimeout(() => { ieViewport.style.opacity = '1'; }, 150);
    });
    loadIeTab('portal');

    // 8. Windows Live Messenger (MSN)
    const msnLog = document.getElementById('msn-chat-log');
    const msnInput = document.getElementById('msn-input');
    const msnWindow = document.getElementById('win-msn');
    const botReplies = [
        'Обожнюю цей скляний інтерфейс Vista!',
        'Ти вже пробував погодувати рибок в Акваріумі 3D?',
        'Звук бульбашок такий заспокійливий...',
        'Спробуй натиснути Підштовхнути (Nudge)!'
    ];

    function sendMsnMessage() {
        const text = msnInput.value.trim();
        if (!text) return;
        msnLog.innerHTML += `<div class="msg-me"><strong>Ви:</strong> ${text}</div>`;
        msnInput.value = '';
        msnLog.scrollTop = msnLog.scrollHeight;
        setTimeout(() => {
            const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
            msnLog.innerHTML += `<div class="msg-them"><strong>Aqua_Dolphin:</strong> ${reply}</div>`;
            msnLog.scrollTop = msnLog.scrollHeight;
            playSystemBeep(750, 0.08);
        }, 650);
    }

    document.getElementById('msn-send').addEventListener('click', sendMsnMessage);
    msnInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsnMessage(); });
    document.getElementById('btn-nudge').addEventListener('click', () => {
        msnWindow.classList.remove('nudge-shake');
        void msnWindow.offsetWidth;
        msnWindow.classList.add('nudge-shake');
        msnLog.innerHTML += `<div class="msg-sys">Ви надіслали підштовхування співрозмовнику!</div>`;
        playSystemBeep(320, 0.15);
    });
    // 9. Інтерактивний Акваріум 3D
    const aqCanvas = document.getElementById('aquarium-canvas');
    const aqCtx = aqCanvas.getContext('2d');
    const fishCountEl = document.getElementById('fish-count');
    const foodCountEl = document.getElementById('food-count');

    let aqFishes = [
        { x: 80, y: 70, vx: 1.4, color: '#ff8c00', size: 12 },
        { x: 220, y: 120, vx: -1.1, color: '#ff5252', size: 14 },
        { x: 150, y: 165, vx: 1.6, color: '#ffbe0b', size: 10 },
        { x: 310, y: 85, vx: -1.3, color: '#ff7043', size: 13 }
    ];
    let aqJellies = [
        { x: 180, y: 90, phase: 0 }
    ];
    let aqFoods = [];

    function updateAqStats() {
        fishCountEl.textContent = aqFishes.length;
        foodCountEl.textContent = aqFoods.length;
    }

    aqCanvas.addEventListener('click', (e) => {
        aqFoods.push({ x: e.offsetX, y: e.offsetY });
        updateAqStats();
        playSystemBeep(820, 0.05);
    });

    document.getElementById('btn-add-fish').addEventListener('click', () => {
        const colors = ['#ff8c00', '#ff5252', '#ffbe0b', '#00f5d4', '#ff70a6'];
        aqFishes.push({
            x: 40 + Math.random() * 320,
            y: 40 + Math.random() * 150,
            vx: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random()),
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 10 + Math.random() * 5
        });
        updateAqStats();
    });

    document.getElementById('btn-add-jelly').addEventListener('click', () => {
        aqJellies.push({
            x: 50 + Math.random() * 300,
            y: 60 + Math.random() * 120,
            phase: Math.random() * Math.PI * 2
        });
        playSystemBeep(680, 0.06);
    });

    function animateAquarium() {
        if (document.getElementById('win-aquarium').style.display !== 'none') {
            aqCtx.clearRect(0, 0, aqCanvas.width, aqCanvas.height);

            // Малюємо корм
            aqCtx.fillStyle = '#fff176';
            aqFoods.forEach(f => {
                f.y = Math.min(aqCanvas.height - 6, f.y + 0.45);
                aqCtx.beginPath();
                aqCtx.arc(f.x, f.y, 3.5, 0, Math.PI * 2);
                aqCtx.fill();
            });

            // Малюємо медуз
            aqJellies.forEach(j => {
                j.phase += 0.05;
                j.y += Math.sin(j.phase) * 0.45;
                aqCtx.fillStyle = 'rgba(200, 245, 255, 0.55)';
                aqCtx.beginPath();
                aqCtx.arc(j.x, j.y, 16, Math.PI, 0);
                aqCtx.fill();
                aqCtx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
                for (let t = -10; t <= 10; t += 5) {
                    aqCtx.beginPath();
                    aqCtx.moveTo(j.x + t, j.y);
                    aqCtx.lineTo(j.x + t + Math.sin(j.phase + t) * 3, j.y + 22);
                    aqCtx.stroke();
                }
            });

            // Малюємо рибок
            aqFishes.forEach(fish => {
                if (aqFoods.length > 0) {
                    const target = aqFoods[0];
                    const dx = target.x - fish.x;
                    const dy = target.y - fish.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 10) {
                        aqFoods.shift();
                        updateAqStats();
                        playSystemBeep(920, 0.04);
                    } else {
                        fish.vx = (dx / dist) * 1.8;
                        fish.y += (dy / dist) * 1.4;
                    }
                }

                fish.x += fish.vx;
                if (fish.x < 16 || fish.x > aqCanvas.width - 16) fish.vx *= -1;

                const dirSign = fish.vx >= 0 ? 1 : -1;
                aqCtx.fillStyle = fish.color;
                aqCtx.beginPath();
                aqCtx.ellipse(fish.x, fish.y, fish.size, fish.size * 0.55, 0, 0, Math.PI * 2);
                aqCtx.fill();

                // Хвіст
                aqCtx.beginPath();
                aqCtx.moveTo(fish.x - dirSign * fish.size, fish.y);
                aqCtx.lineTo(fish.x - dirSign * (fish.size + 8), fish.y - 6);
                aqCtx.lineTo(fish.x - dirSign * (fish.size + 8), fish.y + 6);
                aqCtx.closePath();
                aqCtx.fill();
            });
        }
        requestAnimationFrame(animateAquarium);
    }
    animateAquarium();
    // 10. Windows Media Player (3 локальні треки з папки)
    const tracks = [
        { name: 'Трек 1', src: 'track1.mp3' },
        { name: 'Трек 2', src: 'track2.mp3' },
        { name: 'Трек 3', src: 'track3.mp3' }
    ];

    let currentTrack = 0;
    const audioPlayer = new Audio();
    const visualizer = document.getElementById('visualizer');
    const trackLabel = document.getElementById('track-name');
    const timerLabel = document.getElementById('player-timer');
    const seekBar = document.getElementById('seek-progress');

    function loadTrack(index) {
        currentTrack = (index + tracks.length) % tracks.length;
        trackLabel.textContent = tracks[currentTrack].name;
        audioPlayer.src = tracks[currentTrack].src;
        seekBar.style.width = '0%';
        timerLabel.textContent = '00:00';
    }

    document.getElementById('btn-play').addEventListener('click', () => {
        if (!audioPlayer.src) loadTrack(currentTrack);
        audioPlayer.play();
        visualizer.classList.add('playing');
    });

    document.getElementById('btn-stop').addEventListener('click', () => {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        visualizer.classList.remove('playing');
        seekBar.style.width = '0%';
        timerLabel.textContent = '00:00';
    });

    document.getElementById('btn-next').addEventListener('click', () => {
        loadTrack(currentTrack + 1);
        audioPlayer.play();
        visualizer.classList.add('playing');
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
        loadTrack(currentTrack - 1);
        audioPlayer.play();
        visualizer.classList.add('playing');
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (!audioPlayer.duration) return;
        seekBar.style.width = (audioPlayer.currentTime / audioPlayer.duration) * 100 + '%';
        const mins = String(Math.floor(audioPlayer.currentTime / 60)).padStart(2, '0');
        const secs = String(Math.floor(audioPlayer.currentTime % 60)).padStart(2, '0');
        timerLabel.textContent = `${mins}:${secs}`;
    });

    audioPlayer.addEventListener('ended', () => {
        loadTrack(currentTrack + 1);
        audioPlayer.play();
    });

    loadTrack(0);

    // 11. Paint
    const canvas = document.getElementById('paint-canvas');
    const ctx = canvas.getContext('2d');
    let painting = false, brushColor = '#000000', brushSize = 2;
    ctx.lineCap = 'round';

    canvas.addEventListener('mousedown', (e) => {
        painting = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!painting) return;
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    });

    window.addEventListener('mouseup', () => { painting = false; });

    document.querySelectorAll('.swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            brushColor = swatch.dataset.color;
        });
    });

    document.querySelectorAll('.p-tool[data-size]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.p-tool[data-size]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            brushSize = parseInt(btn.dataset.size);
        });
    });

    document.getElementById('clear-canvas').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // 12. Калькулятор
    const calcDisplay = document.getElementById('calc-display');
    let calcExpr = '';

    document.querySelectorAll('[data-calc]').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.calc;
            if (val === 'C') {
                calcExpr = '';
                calcDisplay.value = '0';
            } else if (val === 'BACK') {
                calcExpr = calcExpr.slice(0, -1);
                calcDisplay.value = calcExpr || '0';
            } else if (val === '=') {
                try {
                    const res = Function('"use strict";return (' + calcExpr + ')')();
                    calcDisplay.value = Number.isFinite(res) ? res : 'Error';
                    calcExpr = String(calcDisplay.value);
                } catch {
                    calcDisplay.value = 'Error';
                    calcExpr = '';
                }
            } else {
                calcExpr += val;
                calcDisplay.value = calcExpr;
            }
        });
    });
    // 13. Міні-гра: Сапер (9x9, 10 мін)
    const minesGrid = document.getElementById('mines-grid');
    const minesCountEl = document.getElementById('mines-count');
    const minesTimerEl = document.getElementById('mines-timer');
    const minesResetBtn = document.getElementById('mines-reset');
    const ROWS = 9, COLS = 9, MINES = 10;
    let board = [], mineGameOver = false, mineSeconds = 0, mineTimer = null, flagsLeft = MINES;

    function initMines() {
        clearInterval(mineTimer);
        mineSeconds = 0;
        mineGameOver = false;
        flagsLeft = MINES;
        minesTimerEl.textContent = '000';
        minesCountEl.textContent = '010';
        minesResetBtn.textContent = 'Нова';
        minesGrid.innerHTML = '';

        board = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }))
        );

        let placed = 0;
        while (placed < MINES) {
            const r = Math.floor(Math.random() * ROWS);
            const c = Math.floor(Math.random() * COLS);
            if (!board[r][c].mine) {
                board[r][c].mine = true;
                placed++;
            }
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c].mine) continue;
                let cnt = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) cnt++;
                    }
                }
                board[r][c].count = cnt;
            }
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'mine-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('click', () => revealCell(r, c));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    toggleFlag(r, c);
                });
                minesGrid.appendChild(cell);
            }
        }

        mineTimer = setInterval(() => {
            if (!mineGameOver && document.getElementById('win-mines').style.display !== 'none') {
                mineSeconds = Math.min(999, mineSeconds + 1);
                minesTimerEl.textContent = String(mineSeconds).padStart(3, '0');
            }
        }, 1000);
    }

    function toggleFlag(r, c) {
        if (mineGameOver || board[r][c].revealed) return;
        const cell = board[r][c];
        cell.flagged = !cell.flagged;
        flagsLeft += cell.flagged ? -1 : 1;
        minesCountEl.textContent = String(Math.max(0, flagsLeft)).padStart(3, '0');
        renderMines();
    }

    function revealCell(r, c) {
        if (mineGameOver || board[r][c].revealed || board[r][c].flagged) return;
        const cell = board[r][c];
        cell.revealed = true;

        if (cell.mine) {
            mineGameOver = true;
            minesResetBtn.textContent = 'Бум';
            playSystemBeep(180, 0.25);
            board.forEach(row => row.forEach(item => { if (item.mine) item.revealed = true; }));
            renderMines();
            return;
        }

        if (cell.count === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) revealCell(nr, nc);
                }
            }
        }

        checkMinesWin();
        renderMines();
    }

    function checkMinesWin() {
        let unrevealedSafe = 0;
        board.forEach(row => row.forEach(cell => {
            if (!cell.mine && !cell.revealed) unrevealedSafe++;
        }));
        if (unrevealedSafe === 0) {
            mineGameOver = true;
            minesResetBtn.textContent = 'Перемога';
            playSystemBeep(880, 0.2);
        }
    }

    function renderMines() {
        const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];
        document.querySelectorAll('.mine-cell').forEach(el => {
            const r = parseInt(el.dataset.r);
            const c = parseInt(el.dataset.c);
            const cell = board[r][c];
            el.className = 'mine-cell';
            el.textContent = '';

            if (cell.revealed) {
                el.classList.add('revealed');
                if (cell.mine) {
                    el.classList.add('bomb');
                    el.textContent = '*';
                } else if (cell.count > 0) {
                    el.textContent = cell.count;
                    el.style.color = colors[cell.count];
                }
            } else if (cell.flagged) {
                el.classList.add('flagged');
                el.textContent = 'F';
            }
        });
    }

    minesResetBtn.addEventListener('click', initMines);
    initMines();

     // 14. Міні-гра: Aqua Пам'ять (4x4, 8 морських пар)
    const memGrid = document.getElementById('memory-grid');
    const memMovesEl = document.getElementById('mem-moves');
    const memPairsEl = document.getElementById('mem-pairs');
    const seaItems = ['Рибка', 'Медуза', 'Дельфін', 'Перлина', 'Корал', 'Зірка', 'Каченя', 'Хвиля'];
    let flippedCards = [], matchedPairs = 0, movesCount = 0, lockBoard = false;

    function initMemoryGame() {
        memGrid.innerHTML = '';
        flippedCards = [];
        matchedPairs = 0;
        movesCount = 0;
        lockBoard = false;
        memMovesEl.textContent = '0';
        memPairsEl.textContent = '0/8';

        const deck = [...seaItems, ...seaItems].sort(() => Math.random() - 0.5);

        deck.forEach(label => {
            const card = document.createElement('div');
            card.className = 'mem-card';
            card.dataset.value = label;
            card.textContent = label;

            card.addEventListener('click', () => {
                if (lockBoard || card.classList.contains('flipped') || card.classList.contains('matched')) return;

                card.classList.add('flipped');
                flippedCards.push(card);
                playSystemBeep(620, 0.05);

                if (flippedCards.length === 2) {
                    movesCount++;
                    memMovesEl.textContent = movesCount;
                    checkMemoryMatch();
                }
            });

            memGrid.appendChild(card);
        });
    }

    function checkMemoryMatch() {
        const [first, second] = flippedCards;
        if (first.dataset.value === second.dataset.value) {
            first.classList.add('matched');
            second.classList.add('matched');
            flippedCards = [];
            matchedPairs++;
            memPairsEl.textContent = `${matchedPairs}/8`;
            playSystemBeep(880, 0.12);
        } else {
            lockBoard = true;
            setTimeout(() => {
                first.classList.remove('flipped');
                second.classList.remove('flipped');
                flippedCards = [];
                lockBoard = false;
            }, 700);
        }
    }

    document.getElementById('mem-restart').addEventListener('click', initMemoryGame);
    initMemoryGame();
});
