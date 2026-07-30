(function () {
    'use strict';

    function initSeasonsPosters() {
        // Слушаем событие полной готовности (отрисовки) карточки фильма
        Lampa.Listener.follow('full', function (e) {
            // Активируем логику только при открытии карточки контента
            if (e.type === 'start' && e.data && e.data.movie) {
                // Небольшой тайм-аут, чтобы стандартные вкладки Lampa успели сформироваться в DOM
                setTimeout(function () {
                    try {
                        buildPostersFromCache(e.data);
                    } catch (err) {
                        console.log('Seasons Posters Plugin Error: ', err);
                    }
                }, 350);
            }
        });
    }

    function buildPostersFromCache(data) {
        // Проверяем, что это сериал, и у Lampa уже есть массив сезонов в памяти
        if (!data.movie.number_of_seasons || !data.movie.seasons || !data.movie.seasons.length) return;

        // Ищем активное окно (Activity) рендеринга карточки
        var activeActivity = Lampa.Activity.active();
        if (!activeActivity || !activeActivity.render) return;

        var render = activeActivity.render;
        
        // Находим контейнер сезонов по внутренним классам Lampa
        var seasonsContainer = render.find('.full-start__seasons, .full-descr__seasons, [data-id="seasons"]');
        if (!seasonsContainer.length) return;

        // Фиксируем оригинальные нативные вкладки для программной симуляции клика пульта
        var nativeTabs = seasonsContainer.find('.full-start__season, .full-descr__season, .full-descr__link');

        // Очищаем стандартную текстовую строчку сезонов
        seasonsContainer.empty();

        // Создаем горизонтальный контейнер-ленту для постеров
        var gridHtml = $('<div class="seasons-posters-grid"></div>');
        gridHtml.css({
            'display': 'flex',
            'flex-direction': 'row',
            'overflow-x': 'auto',
            'gap': '15px',
            'padding': '15px 5px',
            'width': '100%',
            'scroll-behavior': 'smooth',
            'box-sizing': 'border-box',
            'margin-bottom': '10px'
        });

        // Берем данные сезонов прямо из готового объекта Lampa
        data.movie.seasons.forEach(function (season) {
            // Пропускаем Спецвыпуски (0 сезон), если у них нет картинки
            if (season.season_number === 0 && !season.poster_path) return;

            // Формируем прямую ссылку на картинку через штатный конвертер путей Lampa
            var poster = season.poster_path 
                ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                : 'img/plugins/no-poster.png';

            // Имя сезона (если в кэше пусто, пишем стандартное "Сезон X")
            var seasonName = season.name || (season.season_number === 0 ? 'Спецвыпуски' : season.season_number + ' сезон');
            // Количество серий
            var episodesCount = season.episode_count ? season.episode_count + ' сер.' : '';

            // Верстка карточки постера с классом 'selector' для захвата фокуса пульта ДУ
            var item = $(`
                <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 130px; flex-shrink: 0; cursor: pointer; text-align: center; outline: none;">
                    <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 195px; background-size: cover; background-position: center; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); transition: transform 0.15s ease-in-out;"></div>
                    <div class="season-poster-title" style="margin-top: 8px; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${seasonName}</div>
                    <div class="season-poster-count" style="font-size: 11px; color: #b0b0b0; margin-top: 2px;">${episodesCount}</div>
                </div>
            `);

            // Добавляем визуальный эффект увеличения карточки при наведении пульта
            item.on('hover:focus', function () {
                $(this).find('.season-poster-img').css({
                    'transform': 'scale(1.05)',
                    'box-shadow': '0 0 12px #fff',
                    'border': '2px solid #fff'
                });
            }).on('hover:unfocus', function () {
                $(this).find('.season-poster-img').css({
                    'transform': 'scale(1)',
                    'box-shadow': '0 4px 12px rgba(0,0,0,0.6)',
                    'border': 'none'
                });
            });

            // Обработка нажатия кнопки ОК на пульте
            item.on('hover:enter', function () {
                // Проверяем наличие встроенных методов переключения сезонов в Lampa
                if (activeActivity.selectSeason) {
                    activeActivity.selectSeason(season.season_number);
                } else if (activeActivity.object && activeActivity.object.selectSeason) {
                    activeActivity.object.selectSeason(season.season_number);
                } else {
                    // Если методы скрыты, эмулируем клик по оригинальной вкладке, которую мы сохранили
                    var targetTab = nativeTabs.filter('[data-number="' + season.season_number + '"], [data-id="' + season.season_number + '"]');
                    if (!targetTab.length) {
                        // Поиск вкладки по тексту внутри (резервный вариант)
                        nativeTabs.each(function() {
                            if ($(this).text().indexOf(season.season_number) !== -1) targetTab = $(this);
                        });
                    }
                    if (targetTab.length) targetTab.trigger('click');
                }
            });

            gridHtml.append(item);
        });

        seasonsContainer.append(gridHtml);

        // Перезапускаем менеджер навигации Lampa, чтобы зарегистрировать новые постеры для пульта
        if (window.Lampa.Navigator) {
            Lampa.Navigator.update();
        }
    }

    // Регистрация расширения в системе Lampa
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();
