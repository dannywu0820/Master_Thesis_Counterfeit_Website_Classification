//print 5 5 5 5 5
function wrong(){
	for(var i = 0; i < 5; i++){
		setTimeout(function(){
			console.log(i);
		}, 1000*i)
	}
}

//print 0 1 2 3 4
function useLet(){
	for(let i = 0; i < 5; i++){
		setTimeout(function(){
			console.log(i);
		}, 1000*i)
	}
}

//print 0 1 2 3 4
//Immediately Invoked Function Expression
//used when it only executed once
function useIIFE(){
	for(var i = 0; i < 5; i++){
		setTimeout(
			(function(j){
				return function(){
					console.log(j);
				}
			})(i)
		, i*1000);
	}
}

//simulate private member
function closure_application_1(){
	const counter = (function(){
		let count = 0;
		function changeBy(value){
			count+=value;
		}
		
		return {
			increment: function(){
				changeBy(1);
			},
			decrement: function(){
				changeBy(-1);
			},
			value: function(){
				return count;
			}
		}
		
	})();

	console.log(counter.value());
	counter.increment();
	counter.increment();
	console.log(counter.value());
	counter.decrement();
	console.log(counter.value());
}

//data encapsulation
function closure_application_2(){
	const makeCounter = function(){
		let count = 0;
		function changeBy(value){
			count+=value
		}
		
		return {
			increment: function(){
				changeBy(1);
			},
			decrement: function(){
				changeBy(-1);
			},
			value: function(){
				return count;
			}
		}
	}
	//module.exports = makeCounter();
	counter1 = makeCounter()
	counter2 = makeCounter()

	counter1.increment()
	counter1.increment()
	console.log(counter1.value())
	console.log(counter2.value())
}
//lexical environment