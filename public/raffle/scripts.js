$(document).ready(function() {
    // Cargar las rifas disponibles al cargar la página
    fetchRaffles();

    // Configurar eventos
    $(document).on('click', '.raffle-item', function() {
        var raffleId = $(this).data('raffle-id');
        $('#raffle-id').val(raffleId);
        $('#buy-raffle-form').slideDown();
    });

    $('#create-raffle-form').submit(function(event) {
        event.preventDefault();
        var numCount = parseInt($('#numbers').val());
        var maxAmountPerNumber = $('#max-amount-per-number').val();

        $.ajax({
            url: '/raffle/raffles',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ numbers: numCount, maxAmountPerNumber: maxAmountPerNumber }),
            success: function(data) {
                console.log('Rifa creada:', data);
                location.reload();
            },
            error: function(err) {
                console.error('Error al crear la rifa:', err);
                if (err.responseJSON && err.responseJSON.error) {
                    console.error('Mensaje de error del servidor:', err.responseJSON.error);
                }
            }
        });
    });

    $('#buy-raffle-form').submit(function(event) {
        event.preventDefault();
        var raffleId = $('#raffle-id').val();
        var number = $('#raffle-number').val();
        var amountToBuy = $('#amount-to-buy').val();
        var buyerName = $('#buyerName').val();

        $.ajax({
            url: '/raffle/raffles/' + raffleId + '/buy',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ number: number, amount: amountToBuy, buyerName: buyerName }),
            success: function(data) {
                console.log('Número comprado:', data);
                alert('Compra realizada exitosamente.');
                location.reload();
            },
            error: function(err) {
                console.error('Error al comprar el número:', err);
                if (err.responseJSON && err.responseJSON.error) {
                    $('#error-message').text('Error: ' + err.responseJSON.error);
                } else {
                    $('#error-message').text('Ocurrió un error al realizar la compra.');
                }
            }
        });
    });

    $('#register-winner-form').submit(function(event) {
        event.preventDefault();
        var raffleId = $('#raffle-select-winner').val();
        var winningNumber = $('#winning-number').val();

        $.ajax({
            url: '/raffle/raffles/' + raffleId + '/winners',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ number: winningNumber }),
            success: function(data) {
                console.log('Ganador registrado:', data);
                alert('Ganador registrado exitosamente.');
                location.reload();
            },
            error: function(err) {
                console.error('Error al registrar el ganador:', err);
                if (err.responseJSON && err.responseJSON.error) {
                    $('#error-message').text('Error: ' + err.responseJSON.error);
                } else {
                    $('#error-message').text('Ocurrió un error al registrar el ganador.');
                }
            }
        });
    });

    $('#show-winners-btn').click(function() {
        var raffleId = $('#raffle-select-winner').val();
        fetchWinners(raffleId);
    });

    function fetchRaffles() {
        $.ajax({
            url: '/raffle/raffles',
            method: 'GET',
            success: function(data) {
                var raffleOptions = data.map(function(raffle) {
                    return '<option value="' + raffle.id + '">' + raffle.id + '</option>';
                });
                $('#raffle-id, #raffle-select-winner').html(raffleOptions.join(''));
            },
            error: function(err) {
                console.error('Error al obtener las rifas:', err);
            }
        });
    }

    function fetchWinners(raffleId) {
        $.ajax({
            url: '/raffle/raffles/' + raffleId + '/winners',
            method: 'GET',
            success: function(data) {
                var winnersList = data.map(function(winner) {
                    return '<li class="list-group-item">Número: ' + winner.number + '</li>';
                });
                $('#winners-list').html(winnersList.join(''));
            },
            error: function(err) {
                console.error('Error al obtener los ganadores:', err);
            }
        });
    }
});
