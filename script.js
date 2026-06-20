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
        try {
            // Определяем владельца и репозиторий из URL GitHub Pages
            const repoInfo = getRepoInfo();
            if (!repoInfo) {
                showError('Не удалось определить репозиторий');
                return;
            }

            const { owner, repo } = repoInfo;
            
            // Запрос к GitHub API для получения содержимого папки images
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/images`;
            const response = await fetch(apiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    showEmpty();
                } else {
                    showError(`Ошибка API: ${response.status}`);
                }
                return;
            }

            const data = await response.json();
            
            // Фильтруем только файлы-изображения
            const imageFiles = data
                .filter(item => item.type === 'file') // только файлы
                .filter(item => {
                    const ext = '.' + item.name.split('.').pop().toLowerCase();
                    return IMAGE_EXTENSIONS.includes(ext);
                });

            if (imageFiles.length === 0) {
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

            renderGallery();

        } catch (error) {
            console.error('Ошибка загрузки:', error);
            showError('Ошибка загрузки изображений');
        }
    }

    /**
     * Определение владельца и репозитория из URL GitHub Pages
     */
    function getRepoInfo() {
        const url = window.location.href;
        // Формат: https://username.github.io/repo/ или https://username.github.io/
        const match = url.match(/https?:\/\/([^.]+)\.github\.io\/([^\/]+)/);
        if (match) {
            return {
                owner: match[1],
                repo: match[2] || ''
            };
        }
        return null;
    }

    /**
     * Отрисовка галереи
     */
    function renderGallery() {
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');

        imageCount.textContent = `${images.length} изображений 🖼️`;

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
    }

    /**
     * Показ пустого состояния
     */
    function showEmpty() {
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        imageCount.textContent = '0 изображений';
    }

    /**
     * Показ ошибки
     */
    function showError(message) {
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
    loadImages();

})();