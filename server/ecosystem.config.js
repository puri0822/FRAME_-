module.exports = {
  apps: [{
    name: 'yorijori',
    script: 'index.js',
    cwd: '/home/ubuntu/app/server',
    env: {
      PORT: '3000',
      DB_HOST: 'sframe.cdqgkoym8aye.ap-northeast-2.rds.amazonaws.com',
      DB_USER: 'admin',
      DB_PASSWORD: 'ezqqFLi8sZa5xdK',
      DB_NAME: 'sframe',
      FOOD_API_KEY: '799f75d8df354a00b255',
      YOUTUBE_API_KEY: 'AIzaSyD3qFFYKd6ATXnebUhJ_e1JfjIHv3-Ushg'
    }
  }]
};
