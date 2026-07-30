(function () {
    'use strict';

    var observer = null;

    function initSeasonsPosters() {
        // Подписываемся на открытие и закрытие карточек
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'start') {
                startDOMTracking();
            } else if (e.type === 'close') {
                stopDOMTracking();
            }
        });
    }

    function startDOMTracking() {
        stopDOMTracking(); // Сброс старого наблюдателя, если он остался

        // Отслеживаем изменения во всей DOM-структуре приложения Lampa
        observer = new MutationObserver(function (mutations) {
            // Ищем блок сезонов по всем возможным селекторам Lampa (разные версии/моды)
            var target = $('.full-start__seasons, .full-descr__seasons, [data-id="seasons"], .full-start__season').first();
            
            // Если оригинальный блок сезонов появился в DOM и мы его еще не обрабатывали
            if (target.length && !target.hasClass('processed-by-posters')) {
                // Находим родительский контейнер
                var container = target.parent();
                if (container.length) {
                    // Помечаем, чтобы не войти в бесконечный цикл
                    target.addClass('processed-by-posters');
                    tryTransformToPosters(container);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function stopDOMTracking() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function tryTransformToPosters(container) {
        var activeActivity = Lampa.Activity.active();
        if (!activeActivity || !activeActivity.movie || !activeActivity.movie.seasons) return;

        var seasonsData = activeActivity.movie.seasons;
        var nativeTabs = container.find('.full-start__season, .full-descr__season, .full-descr__link');

        // Скрываем оригинальные кнопки (не удаляем через .empty(), чтобы не ломать логику навигации Lampa)
        nativeTabs.css({
            'display': 'none',
            'width': '0px',
            'height': '0px',
            'padding': '0px',
            'margin': '0px',
            'overflow': 'hidden'
        });

        // Если сетка уже существует внутри этого контейнера, удаляем старую версию
        container.find('.seasons-posters-grid').remove();

        // Создаем новую горизонтальную сетку для постеров
        var gridHtml = $('<div class="seasons-posters-grid"></div>');
        gridHtml.css({
            'display': 'flex',
            'flex-direction': 'row',
            'overflow-x': 'auto',
            'gap': '16px',
            'padding': '15px 5px',
            'width': '100%',
            'scroll-behavior': 'smooth',
            'box-sizing': 'border-box'
        });

        seasonsData.forEach(function (season) {
            if (season.season_number === 0 && !season.poster_path) return;

            // Конвертируем относительный путь картинки TMDB через внутреннюю утилиту Lampa
            var poster = season.poster_path 
                ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                : 'img/plugins/no-poster.png';

            var seasonName = season.name || (season.season_number === 0 ? 'Спецвыпуски' : season.season_number + ' сезон');
            var episodesCount = season.episode_count ? season.episode_count + ' сер.' : '';

            // Класс 'selector' необходим, чтобы нативный фокус пульта Lampa Navigator мог выделять элемент
            var item = $(`
                <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 130px; flex-shrink: 0; cursor: pointer; text-align: center; outline: none;">
                    <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 195px; background-size: cover; background-position: center; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); transition: transform 0.15s ease-in-out;"></div>
                    <div class="season-poster-title" style="margin-top: 8px; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${seasonName}</div>
                    <div class="season-poster-count" style="font-size: 11px; color: #b0b0b0; margin-top: 2px;">${episodesCount}</div>
                </div>
            `);

            // Визуальный отклик на фокус пульта ДУ
            item.on('hover:focus', function () {
                $(this).find('.season-poster-img').css({
                    'transform': 'scale(1.05)',
                    'box-shadow': '0 0 14px rgba(255,255,255,0.8)',
                    'border': '2px solid #fff'
                });
            }).on('hover:unfocus', function () {
                $(this).find('.season-poster-img').css({
                    'transform': 'scale(1)',
                    'box-shadow': '0 4px 12px rgba(0,0,0,0.6)',
                    'border': 'none'
                });
            });

            // Эмуляция клика по оригинальным скрытым кнопкам при нажатии "ОК" на пульте
            item.on('hover:enter', function () {
                if (activeActivity.selectSeason) {
                    activeActivity.selectSeason(season.season_number);
                } else {
                    var targetTab = nativeTabs.filter('[data-number="' + season.season_number + '"], [data-id="' + season.season_number + '"]');
                    if (!targetTab.length) {
                        nativeTabs.each(function() {
                            if ($(this).text().indexOf(season.season_number) !== -1) targetTab = $(this);
                        });
                    }
                    if (targetTab.length) targetTab.trigger('click');
                }
            });

            gridHtml.append(item);
        });

        container.append(gridHtml);

        // Принудительно регистрируем новые карточки в системе навигации пульта
        if (window.Lampa.Navigator) {
            Lampa.Navigator.update();
        }
    }

    // Регистрация расширения
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();
