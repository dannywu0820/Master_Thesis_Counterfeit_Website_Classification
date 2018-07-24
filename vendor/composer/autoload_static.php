<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInit3ce51f0a21471991d2acf2dbf2831cbe
{
    public static $prefixLengthsPsr4 = array (
        'P' => 
        array (
            'PhpAmqpLib\\' => 11,
        ),
    );

    public static $prefixDirsPsr4 = array (
        'PhpAmqpLib\\' => 
        array (
            0 => __DIR__ . '/..' . '/php-amqplib/php-amqplib/PhpAmqpLib',
        ),
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixLengthsPsr4 = ComposerStaticInit3ce51f0a21471991d2acf2dbf2831cbe::$prefixLengthsPsr4;
            $loader->prefixDirsPsr4 = ComposerStaticInit3ce51f0a21471991d2acf2dbf2831cbe::$prefixDirsPsr4;

        }, null, ClassLoader::class);
    }
}