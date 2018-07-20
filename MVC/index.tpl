<div class="form">

	<h1>Counterfeit Website Classification</h1>
	
	<div class="error_information"></div>

	<!--Predict Workflow-->
	<fieldset>
		<legend><span class="number">1</span> Predict</legend>
	
		<p>Enter URL of a website you want to classify</p>
    
		<label for="url">[URL]</label>
		<input type="text" id="text_url">
	
		<div class="donut"></div>
		<div class="result" id="result_predict">
			<span id="label">Label: </span></br>
			<span id="probability">Probability: </span></br>
			<span id="reason">Reason: </span></br>
		</div>
		
		<!--Reason Description-->
		<button id="btn_describe" class="buttons">Reason Description</button>
		<table name="description">
		  <tr>
			<th><strong>Feature</strong></th>
			<th><strong>Counterfeit</strong></th>
			<th><strong>Legitimate</strong></th>
		  </tr>
		  <tr>
			<td>num_of_duplicate_prices_seen</td>
			<td>low</td>
			<td>high</td>
		  </tr>
		  <tr>
			<td>percent_savings</td>
			<td>high</td>
			<td>low</td>
		  </tr>
		  <tr>
			<td>under_a_year</td>
			<td>true</td>
			<td>false</td>
		  </tr>
		  <tr>
			<td>has_mobile_app</td>
			<td>false</td>
			<td>true</td>
		  </tr>
		  <tr>
			<td>has_social_media</td>
			<td>false</td>
			<td>true</td>
		  </tr>
		</table>
		<ul id="description">
			<li>num_of_duplicate_prices_seen: 頁面中看到重複價格的次數</li>
			<li>percent_savings: 商品的(平均)折扣</li>
			<li>under_a_year: 網站是否在一年內註冊</li>
			<li>has_mobile_app: 網站是否有自家的Android或iOS app</li>
			<li>has_social_media: 網站是否有<strong>FB,Line或Instagram</strong>的粉絲頁</li>
		</ul>
	</fieldset>
	<button id="btn_predict" class="buttons">Predict</button>

	<!--Feedback Workflow-->
	<fieldset>
		<legend><span class="number">2</span> Feedback</legend>
	
		<p>Do you think our prediction is right?</p>
	
		<label>[Feedback]</label>
		<input type="radio" id="yes" value="Yes" name="feedback"><label for="yes" class="light">Yes</label>
		<input type="radio" id="no" value="No" name="feedback"><label for="no" class="light">No</label>
	
		</br>
		<p>
		If you are not satisfied, you can adjust following features 
		and the system will keep a record of your adjusted features
		</p>
		
		<label for="num_of_duplicate_prices_seen">[num_of_duplicate_prices_seen]</label>
		<input type="text" id="num_of_duplicate_prices_seen" placeholder="Unknown">
	
		<label for="percent_savings">[percent_savings]</label>
		<select id="percent_savings" name="percent_savings">
			<option value=-1>Unknown</option>
			<option value=0>No Discount</option>
			<option value=0.1>10% Off</option>
			<option value=0.2>20% Off</option>
			<option value=0.3>30% Off</option>
			<option value=0.4>40% Off</option>
			<option value=0.5>50% Off</option>
			<option value=0.6>60% Off</option>
			<option value=0.7>70% Off</option>
			<option value=0.8>80% Off</option>
			<option value=0.9>90% Off</option>
		</select>
	
		<label>[under_a_year]</label>
		<input type="radio" id="yes" value=1 name="under_a_year"><label for="yes" class="light">Yes</label>
		<input type="radio" id="no" value=0 name="under_a_year"><label for="no" class="light">No</label>
		<input type="radio" id="unknown" value=-1 name="under_a_year"><label for="unknown" class="light">Unknown</label>
		
		<label>[has_mobile_app]</label>
		<input type="radio" id="yes" value=1 name="has_mobile_app"><label for="yes" class="light">Yes</label>
		<input type="radio" id="no" value=0 name="has_mobile_app"><label for="no" class="light">No</label>
		<input type="radio" id="unknown" value=-1 name="has_mobile_app"><label for="unknown" class="light">Unknown</label>
		
		<label>[has_social_media]</label>
		<input type="radio" id="yes" value=1 name="has_social_media"><label for="yes" class="light">Yes</label>
		<input type="radio" id="no" value=0 name="has_social_media"><label for="no" class="light">No</label>
		<input type="radio" id="unknown" value=-1 name="has_social_media"><label for="unknown" class="light">Unknown</label>
	
		<div class="donut"></div>
		<div class="result" id="result_feedback">
		</div>
	</fieldset>
	<button id="btn_feedback" class="buttons">Feedback</button>
	<button id="btn_feedback_admin" class="buttons">Feedback Admin</button>
	
</div>

<script type="text/javascript" src="{$Config.env.url}/js/index.tpl.js"></script>