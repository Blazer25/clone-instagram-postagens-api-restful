//Importações
const express = require('express'),
    bodyParser = require('body-parser'),
    multiparty = require('connect-multiparty'),
    mongodb = require('mongodb'),
    objectId = require('mongodb').ObjectID,
    fs = require('fs');

const app = express();

// body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(multiparty());

//middleware CORS
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*"); //habilita requisições de dominios diferentes
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE"); //indica os métodos que poderam ter acesso a API
    res.setHeader("Access-Control-Allow-Headers", "content-type"); //reescrever propriedades dos cabeçalhos
    res.setHeader("Access-Control-Allow-Credentials", true); //credenciais
    next()
})

const port = 8080;

app.listen(port);

const db = new mongodb.Db(
    'instagram',
    new mongodb.Server('localhost', 27017, {}),
    {}
);

console.log('Servidor HTTP está escutando na porta ' + port);

//Rota de teste
// app.get('/', function (req, res) {
//     res.send({ msg: 'Olá' });
// });

// POST(criar)
app.post('/api', function (req, res) {

    // Setando data e selo data
    let date = new Date();
    let time_stamp = date.getTime();

    //URL da img, sua origem e seu destino
    let url_imagem = time_stamp + '_' + req.files.arquivo.originalFilename;
    let path_origem = req.files.arquivo.path;
    let path_destino = './uploads/' + url_imagem;

    fs.rename(path_origem, path_destino, function (err) {
        if (err) {
            res.status(500).json({ error: err });
            return;
        }

        //Dados da img
        let dados = {
            url_imagem: url_imagem,
            titulo: req.body.titulo
        }

        //Incluindo postagem
        db.open(function (err, mongoclient) {
            mongoclient.collection('postagens', function (err, collection) {
                collection.insert(dados, function (err, records) {
                    if (err) {
                        res.json({ 'status': 'erro' });
                    } else {
                        res.json({ 'status': 'inclusão realizada com sucesso' });
                    }
                    mongoclient.close();
                });
            });
        });

    });
});

// GET
app.get('/api', function (req, res) {

    db.open(function (err, mongoclient) {
        mongoclient.collection('postagens', function (err, collection) {
            collection.find().toArray(function (err, results) {
                if (err) {
                    res.json(err);
                } else {
                    res.json(results);
                }
                mongoclient.close();
            });
        });
    });
});

// GET por ID
app.get('/api/:id', function (req, res) {
    db.open(function (err, mongoclient) {
        mongoclient.collection('postagens', function (err, collection) {
            collection.find(objectId(req.params.id)).toArray(function (err, results) {
                if (err) {
                    res.json(err);
                } else {
                    res.status(200).json(results);
                }
                mongoclient.close();
            });
        });
    });
});

//GET das imagens
app.get('/imagens/:imagem', function (req, res) {
    const img = req.params.imagem;

    fs.readFile('./uploads/' + img, function (err, content) {
        if (err) {
            res.status(400).json({ err });
            return;
        }

        res.writeHead(200, { 'content-type': 'image/jpg' });
        res.end(content);

    });
});

// PUT por ID(atualizar)
app.put('/api/:id', function (req, res) {
    db.open(function (err, mongoclient) {
        mongoclient.collection('postagens', function (err, collection) {
            collection.update(
                { _id: objectId(req.params.id) },
                {
                    $push: {
                        comentarios: {
                            id_comentario: new objectId(),
                            comentario: req.body.comentario
                        }
                    }
                },
                {},
                function (err, records) {
                    if (err) {
                        res.json(err);
                    } else {
                        res.json(records);
                    }
                    mongoclient.close();
                }
            );
        });
    });
});

// DELETE por ID(deletar)
app.delete('/api/:id', function (req, res) {
    db.open(function (err, mongoclient) {
        mongoclient.collection('postagens', function (err, collection) {
            collection.update(
                {},
                {
                    $pull: {
                        comentarios: {
                            id_comentario: objectId(req.params.id)
                        }
                    }
                },
                { multi: true },
                function (err, records) {
                    if (err) {
                        res.json(err);
                    } else {
                        res.json(records);
                    }
                    mongoclient.close();
                }
            );
        });
    });
});