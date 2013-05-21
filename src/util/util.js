define( function(require){

	return {

		genGUID : (function(){
			var guid = 0;
			
			return function(){
				return ++guid;
			}
		})()
	}
} )