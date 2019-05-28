// Tegan - Note that I'm using the provided jquery solution to the draggable excercise as part
//         of the solution to this.

var objectSocket = io.connect('http://localhost:8080/'); // do not change this line

var objectActive = null;
var intShiftX = 0;
var intShiftY = 0;

$(document).ready(function() {
jQuery(document).on('mousemove', function(e) {
    if (objectActive !== null) {
      jQuery(objectActive)
        .css({
          'position': 'absolute',
          'left': (e.pageX - intShiftX) + 'px',
          'top': (e.pageY - intShiftY) + 'px'
        })
      ;

      var data = {
        'strIdent': objectActive.id,
        'intLeft': objectActive.offsetLeft,
        'intTop': objectActive.offsetTop
      };

      objectSocket.emit('drag', data);

    }
  })
  .on('mouseup', function(e) {

    objectActive = null;
  });
})

$(document).ready(function() {
jQuery('.draggable-black').on('mousedown', function(e) {
  console.log(this);

    if (e.which === 1) {
      objectActive = this;
      intShiftX = e.pageX - $(this).offset().left;
      intShiftY = e.pageY - $(this).offset().top;
      console.log(this);
    }
  });
})

$(document).ready(function() {
jQuery('.draggable-white').on('mousedown', function(e) {
  console.log(this);

    if (e.which === 1) {
      objectActive = this;
      intShiftX = e.pageX - $(this).offset().left;
      intShiftY = e.pageY - $(this).offset().top;
      console.log(this);
    }
  });
})

$(document).ready(function() {
  objectSocket.on('drag', function (objectData) {
    $('#' + objectData.strIdent).css({
      'position': 'absolute',
      'left': (objectData.intLeft) + 'px',
      'top': (objectData.intTop) + 'px'
    });
  });
})
