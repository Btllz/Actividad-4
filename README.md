```mermaid
erDiagram
    USUARIO {
        ObjectId _id PK
        string correo UK "Único, obligatorio"
        string password "Hash bcrypt, obligatorio"
        string rol "usuario (por defecto) o admin"
    }

    PRODUCTO {
        ObjectId _id PK
        string nombre "Obligatorio"
        number precio "Obligatorio, mínimo 0"
        number cantidadDisponible "Obligatorio, mínimo 0"
    }
```
