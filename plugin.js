(function () {
    'use strict';

    function initSeasonsPosters() {
        // Перехватываем стандартный шаблон сборки Lampa до его вывода на экран
        Lampa.Template.add('full_start', function (data) {
            // Базовый HTML-контейнер карточки фильма
            var html = $(`<div class="full-start full-start--tv">
                <div class="full-start__poster"></div>
                <div class="full-start__details">
                    <div class="full-start__title"></div>
                    <div class="full-start__channels"></div>
                    <!-- Наш собственный выделенный контейнер под сетку постеров -->
                    <div class="seasons-posters-wrapper" style="margin-top: 25px; width: 100%;"></div>
                </div>
            </div>`);

            // Проверяем, что открыт именно сериал, и в кэше Lampa есть массив сезонов
            if (data.movie && data.movie.number_of_seasons && data.movie.seasons && data.movie.seasons.length) {
                
                var grid = $('<div class="seasons-posters-grid"></div>');
                grid.css({
                    'display': 'flex',
                    'flex-direction': 'row',
                    'overflow-x': 'auto',
                    'gap': '16px',
                    'padding': '15px 5px',
                    'width': '100%',
                    'scroll-behavior': 'smooth',
                    'box-sizing': 'border-box'
                });

                data.movie.seasons.forEach(function (season) {
                    // Игнорируем Спецвыпуски (0 сезон), если для них нет изображения
                    if (season.season_number === 0 && !season.poster_path) return;

                    // Извлекаем и генерируем прямую ссылку на картинку через ядро Lampa
                    var poster = season.poster_path 
                        ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                        : 'img/plugins/no-poster.png';

                    var seasonName = season.name || (season.season_number === 0 ? 'Спецвыпуски' : season.season_number + ' сезон');
                    var episodesCount = season.episode_count ? season.episode_count + ' сер.' : '';

                    // Шаблон одной карточки. Класс 'selector' критически важен для навигации пультом ТВ!
                    var item = $(`
                        <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 130px; flex-shrink: 0; cursor: pointer; text-align: center; outline: none;">
                            <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 195px; background-size: cover; background-position: center; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); transition: transform 0.15s ease-in-out;"></div>
                            <div class="season-poster-title" style="margin-top: 8px; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${seasonName}</div>
                            <div class="season-poster-count" style="font-size: 11px; color: #b0b0b0; margin-top: 2px;">${episodesCount}</div>
                        </div>
                    `);

                    // Эффекты масштабирования и подсветки рамки при наведении фокуса пульта ДУ
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

                    // Обработка нажатия кнопки "ОК" на пульте
                    item.on('hover:enter', function () {
                        var activeActivity = Lampa.Activity.active();
                        if (activeActivity) {
                            if (activeActivity.selectSeason) {
                                activeActivity.selectSeason(season.season_number);
                            } else if (activeActivity.object && activeActivity.object.selectSeason) {
                                activeActivity.object.selectSeason(season.season_number);
                            } else {
                                Lampa.Noty.show('Сезон ' + season.season_number + ' выбран');
                            }
                        }
                    });

                    grid.append(item);
                });

                html.find('.seasons-posters-wrapper').append(grid);
            }

            // Дожидаемся внедрения в DOM и мягко обновляем менеджер навигации Lampa Navigator
            setTimeout(function() {
                if (window.Lampa.Navigator) {
                    window.Lampa.Navigator.update();
                }
            }, 200);

            return html;
        });
    }

    // Регистрация расширения в зависимости от текущего состояния загрузки приложения
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();
