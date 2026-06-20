/**
 * Сайт славы @Blame54 — Галерея поняшек
 * Загружает реальный список изображений через GitHub API
 */

(function () {
    'use strict';

    // Поддерживаемые расширения изображений
    const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'];

    // DOM-элементы
    const galleryGrid = document.getElementById('galleryGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const imageCount = document.getElementById('imageCount');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const modalClose = document.getElementById('modalClose');
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');

    let images = [];
    let currentIndex = 0;

    /**
     * Загрузка списка изображений из папки images
     */
    async function loadImages() {
        console.log('[Gallery] Начинаем загрузку...');
        
        try {
            // Определяем владельца и репозиторий из URL GitHub Pages
            const repoInfo = getRepoInfo();
            console.log('[Gallery] repoInfo:', repoInfo);
            
            if (!repoInfo) {
                console.error('[Gallery] Не удалось определить репозиторий');
                showError('Не удалось определить репозиторий');
                return;
            }

            const { owner, repo } = repoInfo;
            
            // Запрос к GitHub API для получения содержимого папки images
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/images`;
            console.log('[Gallery] Запрашиваем URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });

            console.log('[Gallery] Статус ответа:', response.status);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('[Gallery] Папка images не найдена (404)');
                    showEmpty();
                } else {
                    console.error('[Gallery] Ошибка API:', response.status);
                    showError(`Ошибка API: ${response.status}`);
                }
                return;
            }

            const data = await response.json();
            console.log('[Gallery] Получено файлов:', data.length);
            console.log('[Gallery] Первые 3 файла:', data.slice(0, 3));
            
            // Фильтруем только файлы-изображения
            const imageFiles = data
                .filter(item => {
                    const isFile = item.type === 'file';
                    console.log(`[Gallery] ${item.name}: type=${item.type}, isFile=${isFile}`);
                    return isFile;
                })
                .filter(item => {
                    const ext = '.' + item.name.split('.').pop().toLowerCase();
                    const isImage = IMAGE_EXTENSIONS.includes(ext);
                    console.log(`[Gallery] ${item.name}: ext=${ext}, isImage=${isImage}`);
                    return isImage;
                });

            console.log('[Gallery] Найдено изображений:', imageFiles.length);
            console.log('[Gallery] Имена изображений:', imageFiles.map(f => f.name));

            if (imageFiles.length === 0) {
                console.warn('[Gallery] Изображений не найдено');
                showEmpty();
                return;
            }

            // Сортируем по имени
            imageFiles.sort((a, b) => a.name.localeCompare(b.name));

            // Сохраняем данные о картинках
            images = imageFiles.map((file, index) => ({
                name: file.name,
                url: file.download_url, // прямая ссылка на файл
                index: index
            }));

            console.log('[Gallery] Успешно загружено', images.length, 'изображений');
            renderGallery();

        } catch (error) {
            console.error('[Gallery] Исключение при загрузке:', error);
            showError('Ошибка загрузки изображений: ' + error.message);
        }
    }

    /**
     * Определение владельца и репозитория из URL GitHub Pages
     */
    function getRepoInfo() {
        const url = window.location.href;
        console.log('[Gallery] Текущий URL:', url);
        
        // Формат: https://username.github.io/repo/ или https://username.github.io/
        const match = url.match(/https?:\/\/([^.]+)\.github\.io\/([^\/]+)/);
        console.log('[Gallery] Результат match:', match);
        
        if (match) {
            return {
                owner: match[1],
                repo: match[2] || ''
            };
        }
        
        // fallback: если локально, пробуем использовать MusicCat-61/blame54
        console.warn('[Gallery] Не удалось определить из URL, используем fallback');
        return {
            owner: 'MusicCat-61',
            repo: 'blame54'
        };
    }

    /**
     * Отрисовка галереи
     */
    function renderGallery() {
        console.log('[Gallery] Отрисовка галереи, изображений:', images.length);
        
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');

        imageCount.textContent = `Картинок: ${images.length}`;

        // Очищаем сетку
        const items = galleryGrid.querySelectorAll('.gallery-item');
        items.forEach(el => el.remove());

        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.index = index;

            const imgEl = document.createElement('img');
            imgEl.src = img.url;
            imgEl.alt = img.name;
            imgEl.loading = 'lazy';
            
            // Если картинка не загрузилась
            imgEl.onerror = function() {
                console.warn('[Gallery] Не удалось загрузить:', img.url);
                this.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.style.cssText = `
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    background: #151520;
                    color: #505060;
                    font-size: 48px;
                `;
                fallback.textContent = '🖼️';
                this.parentNode.prepend(fallback);
            };

            imgEl.onload = function() {
                console.log('[Gallery] Загружено:', img.name);
            };

            const overlay = document.createElement('div');
            overlay.className = 'item-overlay';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.textContent = img.name;

            const indexSpan = document.createElement('span');
            indexSpan.className = 'item-index';
            indexSpan.textContent = `#${index + 1}`;

            overlay.appendChild(nameSpan);
            overlay.appendChild(indexSpan);
            item.appendChild(imgEl);
            item.appendChild(overlay);

            item.addEventListener('click', () => openModal(index));
            galleryGrid.appendChild(item);
        });
        
        console.log('[Gallery] Отрисовка завершена');
    }

    /**
     * Показ пустого состояния
     */
    function showEmpty() {
        console.warn('[Gallery] Показ пустого состояния');
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        imageCount.textContent = 'Картинок: 0';
    }

    /**
     * Показ ошибки
     */
    function showError(message) {
        console.error('[Gallery] Ошибка:', message);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        const p = emptyState.querySelector('p');
        if (p) p.textContent = `❌ ${message}`;
        const hint = emptyState.querySelector('.hint');
        if (hint) hint.textContent = 'Проверьте, что папка images существует и содержит изображения';
        imageCount.textContent = 'Ошибка';
    }

    // ===== МОДАЛЬНОЕ ОКНО =====
    function openModal(index) {
        currentIndex = index;
        const img = images[currentIndex];
        if (!img) return;

        modalImage.src = img.url;
        modalCaption.textContent = `${img.name} (${currentIndex + 1}/${images.length})`;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        modalImage.src = '';
    }

    function navigateModal(direction) {
        if (images.length === 0) return;
        const newIndex = (currentIndex + direction + images.length) % images.length;
        openModal(newIndex);
    }

    // ===== СОБЫТИЯ =====
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft' && !modal.classList.contains('hidden')) navigateModal(-1);
        if (e.key === 'ArrowRight' && !modal.classList.contains('hidden')) navigateModal(1);
    });

    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateModal(-1);
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateModal(1);
    });

    // ===== ЗАПУСК =====
    console.log('[Gallery] Инициализация...');
    // Ждём, пока DOM полностью загрузится
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadImages);
    } else {
        loadImages();
    }

})();