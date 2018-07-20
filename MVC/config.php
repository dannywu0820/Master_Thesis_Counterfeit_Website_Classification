<?php

$GLOBALS['config'] = array(
   'name' => 'Counterfeit_Website_Classifier_FFF',
   'active_env' => 'dev',
   'admins' => array(
      # 'uid' => TRUE or FALSE
   ),
   'env' => array(
      'dev' => array(
         'fb' => array(
            'app_id'  => '',
            'secret'  => '',
            'canvas'  => 'Counterfeit_Website_Classifier_FFF-dev',
            'page_id' => '',
         ),
         'db' => array(
            'phptype'  => 'mysql',
            'username' => 'danny',
            'password' => 'livebetterlife',
            'hostspec' => 'localhost',
            'database' => 'auto_sql_tool',
         ),
         'memcache' => array(
            'host' => 'localhost',
            'port' => '11211',
         ),
         'url' => "//dev3.pushfun.com/~danny/Counterfeit_Website_Classifier_FFF/",
         'admin_tabs' => array('text',),
		 'rabbitmq' => array(
			'host' => '140.113.207.206',
			'port' => 5672,
			'user' => 'danny',
			'password' => 'livebetterlife'
		 ),
         //'log' => PEAR_LOG_DEBUG,
      ),
      'pro' => array(
         'fb' => array(
            'app_id'  => '',
            'secret'  => '',
            'canvas'  => 'Counterfeit_Website_Classifier_FFF',
            'page_id' => '',
         ),
         'db' => array(
            'phptype'  => 'mysql',
            'username' => 'danny',
            'password' => '',
            'hostspec' => 'mysql1.funptw',
            'database' => 'Counterfeit_Website_Classifier_FFF',
         ),
         'memcache' => array(
            'host' => 'mem2.funptw',
            'port' => '16890',
         ),
         'url' => "//appx.cacafly.com/Counterfeit_Website_Classifier_FFF/",
         'admin_tabs' => array('text',),
         //'log' => PEAR_LOG_DEBUG,
      ),
   ),

   /*
   # subscribe changes in data from Facebook
   # ref: http://developers.facebook.com/docs/api/realtime
   # run 'php toolkit.php update_subscription after modify subscription
   'subscription' => array(
      # object => fields in a comma separate string 
      # 'user' => 'name,gender,birthday,email,link,about,picture,likes,verified,timezone',
      # 'permissions' => 'publish_stream,offline_access',
   ),
   //*/
   
);

$protocol = (@$_SERVER['HTTP_PORT'] == 80) ? 'http:' : 'https:';
$protocol = (@$_SERVER['HTTP_PORT'] == 80) ? 'http:' : 'https:';
foreach ($GLOBALS['config']['env'] as &$env) {
   $env['url'] = $protocol.$env['url'];
}
