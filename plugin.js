(function () {
    'use strict';

    function initSeasonsPosters() {
        // Подключаемся к моменту создания интерфейса карточки фильма
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'start' && e.data && e.data.movie) {
                // Заменяем метод отображения селектора сезонов для текущей активной карточки
                setTimeout(function() {
                    interceptLampaSeasons(e.data);
                }, 200);
            }
        });
    }

    function interceptLampaSeasons(cardData) {
        var activeActivity = Lampa.Activity.active();
        if (!activeActivity || !activeActivity.movie || !activeActivity.movie.seasons) return;

        // Находим оригинальную функцию, которая открывает список серий/сезонов
        if (activeActivity.object && activeActivity.object.selectSeason) {
            // Если плагин еще не перехватил метод
            if (!activeActivity.object.selectSeason.isIntercepted) {
                var originalSelectSeason = activeActivity.object.selectSeason;

                // Создаем свой собственный обработчик
                activeActivity.object.selectSeason = function(season_number) {
                    // Вызываем оригинальное действие, чтобы сессии и плеер знали выбранный сезон
                    originalSelectSeason.apply(this, arguments);
                    
                    // Форсируем перерисовку блока сезонов в виде постеров
                    injectPostersDirectly();
                };
                activeActivity.object.selectSeason.isIntercepted = true;
            }
        }

        // Запускаем первичную инжекцию постеров
        injectPostersDirectly();
    }

    function injectPostersDirectly() {
        var activeActivity = Lampa.Activity.active();
        if (!activeActivity || !activeActivity.render) return;

        var render = activeActivity.render;
        // Расширенный поиск контейнера по абсолютно всем существующим классам модов Lampa
        var seasonsContainer = render.find('.full-start__seasons, .full-descr__seasons, [data-id="seasons"], .full-start__season, .full-descr__link').first().parent();
        
        if (!seasonsContainer.length) return;

        var seasonsData = activeActivity.movie.seasons;
        if (!seasonsData || !seasonsData.length) return;

        // Полностью очищаем контейнер, заставляя Лампу забыть про старую верстку
        seasonsContainer.empty();

        // Строим горизонтальную ленту-сетку
        var gridHtml = $('<div class="seasons-posters-grid"></div>');
        gridHtml.css({
            'display': 'flex',
            'flex-direction': 'row',
            'overflow-x': 'auto',
            'gap': '14px',
            'padding': '15px 5px',
            'width': '100%',
            'scroll-behavior': 'smooth',
            'box-sizing': 'border-box'
        });

        seasonsData.forEach(function (season) {
            if (season.season_number === 0 && !season.poster_path) return;

            // Конвертируем картинку TMDB через нативный метод ядра
            var poster = season.poster_path 
                ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                : 'img/plugins/no-poster.png';

            var seasonName = season.name || (season.season_number === 0 ? 'Спецвыпуски' : season.season_number + ' сезон');
            var episodesCount = season.episode_count ? season.episode_count + ' сер.' : '';

            // Верстка карточки постера с обязательным для пультов классом 'selector'
            var item = $(`
                <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 125px; flex-shrink: 0; cursor: pointer; text-align: center; outline: none; margin-right: 5px;">
                    <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 185px; background-size: cover; background-position: center; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.7); transition: transform 0.15s ease;"></div>
                    <div class="season-poster-title" style="margin-top: 6px; font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${seasonName}</div>
                    <div class="season-poster-count" style="font-size: 11px; color: #aaaaaa; margin-top: 2px;">${episodesCount}</div>
                </div>
            `);

            // Интеграция фокуса для навигации с пульта Смарт-ТВ
            item.on('hover:focus', function () {
                $(this).find('.season-poster-img').css({
                    'transform': 'scale(1.06)',
                    'box-shadow': '0 0 12px #fff',
                    'border': '2px solid #fff'
                });
            }).on('hover:unfocus', function () {
                $(this).find('.season-poster-img').css({
                    'transform': 'scale(1)',
                    'box-shadow': '0 4px 10px rgba(0,0,0,0.7)',
                    'border': 'none'
                });
            });

            // Обработка клика (кнопка ОК на пульте)
            item.on('hover:enter', function () {
                if (activeActivity.object && activeActivity.object.selectSeason) {
                    // Активируем выбор сезона напрямую в обход UI
                    activeActivity.object.selectSeason(season.season_number);
                }
            });

            gridHtml.append(item);
        });

        seasonsContainer.append(gridHtml);

        // Перезапускаем навигационный модуль Navigator, чтобы пульт увидел новые кнопки-постеры
        if (window.Lampa.Navigator) {
            Lampa.Navigator.update();
        }
    }

    // Регистрация в экосистеме Лампы
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();
